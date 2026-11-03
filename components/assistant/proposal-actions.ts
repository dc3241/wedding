"use server";

import { revalidatePath } from "next/cache";
import {
  addBudgetItem,
  setBudgetTarget,
  updateBudgetItem,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import type {
  BudgetChange,
  BudgetProposalPayload,
} from "@/lib/assistant/proposals";
import { createClient } from "@/utils/supabase/server";

export type ProposalActionResult = { ok: true } | { ok: false; error: string };

type ProposalRow = {
  id: string;
  project_id: string;
  kind: string;
  status: string;
  payload: BudgetProposalPayload | null;
};

function isBudgetChange(value: unknown): value is BudgetChange {
  if (!value || typeof value !== "object") return false;
  const op = (value as { op?: unknown }).op;
  return op === "set_target" || op === "set_planned" || op === "add_item";
}

async function failProposal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  message: string,
  userId: string,
) {
  await supabase
    .from("assistant_proposals")
    .update({
      status: "failed",
      error: message,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("id", id)
    .in("status", ["pending", "applied"]);
}

/**
 * Apply a pending budget proposal through the normal budget writers.
 * Stale check first (a changed line fails the whole proposal rather than
 * overwriting newer edits), then an atomic pending -> applied claim so a
 * double tap can never apply twice.
 */
export async function applyAssistantProposal(
  proposalId: string,
): Promise<ProposalActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in." };

  const { data, error } = await supabase
    .from("assistant_proposals")
    .select("id, project_id, kind, status, payload")
    .eq("id", proposalId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Proposal not found." };

  const proposal = data as ProposalRow;
  if (proposal.kind !== "budget_change") {
    return { ok: false, error: "This proposal type can't be applied yet." };
  }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }

  const changes = (proposal.payload?.changes ?? []).filter(isBudgetChange);
  if (changes.length === 0) {
    return { ok: false, error: "This proposal has no changes." };
  }

  // Stale check: every line we are about to edit must still match.
  const itemIds = changes.flatMap((c) => (c.op === "set_planned" ? [c.itemId] : []));
  if (itemIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from("budget_items")
      .select("id, planned_amount")
      .eq("project_id", proposal.project_id)
      .in("id", itemIds);
    if (itemsError) return { ok: false, error: itemsError.message };
    const current = new Map(
      (items ?? []).map((row) => [row.id as string, Number(row.planned_amount ?? 0)]),
    );
    for (const change of changes) {
      if (change.op !== "set_planned") continue;
      const now = current.get(change.itemId);
      if (now === undefined || now !== change.from) {
        const message =
          "Your budget changed since this was proposed. Ask the assistant to propose it again.";
        await failProposal(supabase, proposal.id, message, user.id);
        revalidatePath(`/projects/${proposal.project_id}`, "layout");
        return { ok: false, error: message };
      }
    }
  }

  const { data: claimed, error: claimError } = await supabase
    .from("assistant_proposals")
    .update({
      status: "applied",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", proposal.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This proposal was already handled." };

  try {
    for (const change of changes) {
      if (change.op === "set_target") {
        await setBudgetTarget(proposal.project_id, change.to);
      } else if (change.op === "set_planned") {
        await updateBudgetItem(change.itemId, { planned_amount: change.to });
      } else {
        await addBudgetItem(
          proposal.project_id,
          change.category ?? "",
          change.label,
          change.planned,
        );
      }
    }
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Could not apply every change.";
    await failProposal(supabase, proposal.id, message, user.id);
    revalidatePath(`/projects/${proposal.project_id}`, "layout");
    return {
      ok: false,
      error:
        "Some changes may have applied before something went wrong. Check the Budget tab, then ask the assistant to redo the rest.",
    };
  }

  revalidatePath(`/projects/${proposal.project_id}`, "layout");
  return { ok: true };
}

export async function rejectAssistantProposal(
  proposalId: string,
): Promise<ProposalActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be logged in." };

  const { data, error } = await supabase
    .from("assistant_proposals")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select("project_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This proposal was already handled." };

  revalidatePath(`/projects/${data.project_id}`, "layout");
  return { ok: true };
}
