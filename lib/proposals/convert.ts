import "server-only";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  parseProposalLineItems,
} from "@/components/proposals/types";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import { invoiceLineAmount } from "@/lib/invoices/lines";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ConvertProposalResult =
  | { ok: true; invoiceId: string; projectId: string; invoiceAccessToken: string | null }
  | { ok: false; error: string };

function asLeadEmbed(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

function proposalInvoiceLineItems(lineItems: unknown) {
  return parseProposalLineItems(lineItems)
    .filter((item) => item.quantity > 0 && item.description.trim())
    .map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      kind: "item" as const,
      amount: invoiceLineAmount("item", item.quantity, item.unit_price),
    }));
}

/**
 * Create (or reuse) a project from an accepted proposal and attach an invoice.
 * Caller must ensure proposal.status === 'accepted'. Works with user or service-role client.
 */
export async function convertAcceptedProposal(
  proposalId: string,
  client: SupabaseClient,
): Promise<ConvertProposalResult> {
  const { data: proposal, error: proposalError } = await client
    .from("proposals")
    .select(
      "id, account_id, lead_id, status, notes, terms, line_items, leads!inner(account_id, couple_name, contact_email, wedding_date, project_id, stage)",
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalError || !proposal) {
    return { ok: false, error: proposalError?.message ?? "Proposal not found." };
  }

  if (proposal.status !== "accepted") {
    return { ok: false, error: "Accept the proposal first." };
  }

  const lineItems = proposalInvoiceLineItems(proposal.line_items);
  if (lineItems.length === 0) {
    return { ok: false, error: "Add line items to the proposal first." };
  }

  const lead = asLeadEmbed(proposal.leads);
  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  if (lead.account_id !== proposal.account_id) {
    return { ok: false, error: "That lead isn't on this account." };
  }

  let projectId =
    typeof lead.project_id === "string" ? lead.project_id.trim() : "";

  if (projectId) {
    const { data: existing } = await client
      .from("projects")
      .select("id, account_id, archived_at")
      .eq("id", projectId)
      .maybeSingle();
    if (
      !existing ||
      existing.account_id !== proposal.account_id ||
      existing.archived_at
    ) {
      projectId = "";
    }
  }

  if (!projectId) {
    const name =
      typeof lead.couple_name === "string" ? lead.couple_name.trim() : "";
    if (!name) {
      return { ok: false, error: "Couple name is required." };
    }

    const weddingDate =
      typeof lead.wedding_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(lead.wedding_date)
        ? lead.wedding_date
        : null;

    projectId = randomUUID();
    const { error: insertError } = await client.from("projects").insert({
      id: projectId,
      account_id: proposal.account_id,
      name,
      wedding_date: weddingDate,
    });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    const previousStage =
      typeof lead.stage === "string" ? lead.stage : "inquiry";
    const { error: leadError } = await client
      .from("leads")
      .update({
        project_id: projectId,
        stage: "booked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.lead_id);

    if (leadError) {
      return { ok: false, error: leadError.message };
    }

    if (previousStage !== "booked") {
      await dispatchLeadAutomation({
        accountId: proposal.account_id,
        leadId: proposal.lead_id,
        triggerKind: "lead_stage_changed",
        fromStage: previousStage,
        toStage: "booked",
      });
    }

    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    revalidatePath(`/projects/${projectId}`);
  } else if (lead.stage !== "booked") {
    const previousStage =
      typeof lead.stage === "string" ? lead.stage : "inquiry";
    const { error: stageError } = await client
      .from("leads")
      .update({
        stage: "booked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.lead_id);
    if (stageError) {
      return { ok: false, error: stageError.message };
    }
    await dispatchLeadAutomation({
      accountId: proposal.account_id,
      leadId: proposal.lead_id,
      triggerKind: "lead_stage_changed",
      fromStage: previousStage,
      toStage: "booked",
    });
  }

  const { data: existingInvoice } = await client
    .from("invoices")
    .select("id, access_token")
    .eq("proposal_id", proposal.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInvoice) {
    return {
      ok: true,
      invoiceId: existingInvoice.id,
      projectId,
      invoiceAccessToken:
        typeof existingInvoice.access_token === "string"
          ? existingInvoice.access_token
          : null,
    };
  }

  const { data: invoice, error: invoiceError } = await client
    .from("invoices")
    .insert({
      project_id: projectId,
      account_id: proposal.account_id,
      client_name:
        typeof lead.couple_name === "string" ? lead.couple_name : null,
      client_email:
        typeof lead.contact_email === "string" ? lead.contact_email : null,
      notes: proposal.notes,
      terms: proposal.terms,
      proposal_id: proposal.id,
    })
    .select("id, access_token")
    .single();

  if (invoiceError || !invoice) {
    return {
      ok: false,
      error: invoiceError?.message ?? "Couldn't create invoice.",
    };
  }

  const { error: itemsError } = await client.from("invoice_line_items").insert(
    lineItems.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      unit_price: item.unit_price,
      kind: item.kind,
      sort_order: index,
    })),
  );

  if (itemsError) {
    await client.from("invoices").delete().eq("id", invoice.id);
    return { ok: false, error: itemsError.message };
  }

  revalidatePath(`/projects/${projectId}/invoices`);
  revalidatePath(`/projects/${projectId}/invoices/${invoice.id}`);
  revalidatePath("/money");
  revalidatePath("/invoices");

  return {
    ok: true,
    invoiceId: invoice.id,
    projectId,
    invoiceAccessToken:
      typeof invoice.access_token === "string" ? invoice.access_token : null,
  };
}
