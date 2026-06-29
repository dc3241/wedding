"use server";

import { revalidatePath } from "next/cache";
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
  if (proposalId) {
    revalidatePath(contractPath(leadId, proposalId));
  }
}

async function resolveBusinessAccountId() {
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
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
