"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import { createInvoice } from "@/lib/invoices/actions";
import { createClient } from "@/utils/supabase/server";
import {
  PROPOSAL_STATUSES,
  computeProposalTotal,
  parseProposalLineItems,
  type ProposalLineItem,
  type ProposalStatus,
} from "@/components/proposals/types";

function leadDetailPath(leadId: string) {
  return `/leads/${leadId}`;
}

function contractPath(leadId: string, proposalId: string) {
  return `/leads/${leadId}/proposals/${proposalId}/contract`;
}

function revalidateProposalPaths(leadId: string, proposalId?: string) {
  revalidatePath(leadDetailPath(leadId));
  revalidatePath("/leads");
  if (proposalId) {
    revalidatePath(contractPath(leadId, proposalId));
  }
}

function proposalInvoiceLineItems(lineItems: unknown) {
  return parseProposalLineItems(lineItems)
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      kind: "item" as const,
    }));
}

function asLeadEmbed(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

async function resolveBusinessAccountId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No business account found.");
  }

  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("user_id", user.id)
    .eq("accounts.kind", "business")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error("No business account found.");
  }

  return membership.account_id;
}

export async function createProposal(
  leadId: string,
): Promise<
  { ok: true; proposalId: string } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      return { ok: false, error: leadError.message };
    }

    if (!lead) {
      return { ok: false, error: "Lead not found." };
    }

    const accountId = await resolveBusinessAccountId();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        account_id: accountId,
        lead_id: leadId,
        line_items: [],
        total: 0,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !proposal) {
      return { ok: false, error: error?.message ?? "Could not create proposal." };
    }

    revalidateProposalPaths(leadId);
    return { ok: true, proposalId: proposal.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create proposal.",
    };
  }
}

export async function updateProposal(
  id: string,
  fields: {
    title?: string;
    line_items?: ProposalLineItem[];
    terms?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("proposals")
    .select("lead_id, status")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message ?? "Proposal not found." };
  }

  if (existing.status === "accepted") {
    return {
      ok: false,
      error: "Accepted proposals are locked. Change status to edit.",
    };
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (!title) {
      return { ok: false, error: "Title is required." };
    }
    payload.title = title;
  }

  if (fields.line_items !== undefined) {
    const lineItems = parseProposalLineItems(fields.line_items);
    payload.line_items = lineItems;
    payload.total = computeProposalTotal(lineItems);
  }

  if (fields.terms !== undefined) {
    const trimmed = fields.terms?.trim();
    payload.terms = trimmed ? trimmed : null;
  }

  if (fields.notes !== undefined) {
    const trimmed = fields.notes?.trim();
    payload.notes = trimmed ? trimmed : null;
  }

  const { error } = await supabase.from("proposals").update(payload).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProposalPaths(existing.lead_id, id);
  return { ok: true };
}

export async function updateProposalStatus(
  id: string,
  status: ProposalStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!PROPOSAL_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("proposals")
    .select("lead_id")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message ?? "Proposal not found." };
  }

  const { error } = await supabase
    .from("proposals")
    .update({
      status,
      accepted_at: status === "accepted" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProposalPaths(existing.lead_id, id);
  return { ok: true };
}

export async function deleteProposal(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("proposals")
    .select("lead_id")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message ?? "Proposal not found." };
  }

  const { error } = await supabase.from("proposals").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProposalPaths(existing.lead_id, id);
  return { ok: true };
}

export async function createInvoiceFromProposal(
  proposalId: string,
  projectId: string,
): Promise<
  | { ok: true; invoiceId: string; projectId: string }
  | { ok: false; error: string }
> {
  const trimmedProject = projectId.trim();
  if (!trimmedProject) {
    return { ok: false, error: "Choose where to create this invoice." };
  }

  const supabase = await createClient();
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select(
      "id, account_id, lead_id, status, notes, terms, line_items, leads!inner(couple_name, contact_email)",
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalError || !proposal) {
    return { ok: false, error: proposalError?.message ?? "Proposal not found." };
  }

  if (proposal.status !== "accepted") {
    return { ok: false, error: "Accept the proposal before creating an invoice." };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id, archived_at")
    .eq("id", trimmedProject)
    .maybeSingle();

  if (projectError || !project) {
    return { ok: false, error: projectError?.message ?? "Project not found." };
  }

  if (project.account_id !== proposal.account_id) {
    return { ok: false, error: "That project isn't on this account." };
  }

  if (project.archived_at) {
    return { ok: false, error: "Pick an active project." };
  }

  const lead = asLeadEmbed(proposal.leads);
  const lineItems = proposalInvoiceLineItems(proposal.line_items);

  if (lineItems.length === 0) {
    return { ok: false, error: "Add line items to the proposal first." };
  }

  const created = await createInvoice(trimmedProject, {
    clientName:
      typeof lead?.couple_name === "string" ? lead.couple_name : null,
    clientEmail:
      typeof lead?.contact_email === "string" ? lead.contact_email : null,
    notes: proposal.notes,
    terms: proposal.terms,
    proposalId: proposal.id,
    lineItems,
  });

  if (!created.ok) return created;

  revalidateProposalPaths(proposal.lead_id, proposal.id);
  return { ok: true, invoiceId: created.id, projectId: trimmedProject };
}

export async function createProjectAndInvoiceFromProposal(
  proposalId: string,
): Promise<
  | { ok: true; invoiceId: string; projectId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select(
      "id, account_id, lead_id, status, line_items, leads!inner(account_id, couple_name, wedding_date, project_id, stage)",
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
    const { data: existing } = await supabase
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
    const { error: insertError } = await supabase.from("projects").insert({
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
    const { error: leadError } = await supabase
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
  }

  return createInvoiceFromProposal(proposalId, projectId);
}
