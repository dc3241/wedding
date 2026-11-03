"use server";

import { revalidatePath } from "next/cache";
import {
  addBudgetItem,
  setBudgetTarget,
  updateBudgetItem,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import { addTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import {
  firstNameFor,
  RSVP_REMINDER_COOLDOWN_DAYS,
  type BudgetChange,
  type BudgetProposalPayload,
  type ChecklistReplanPayload,
  type RsvpReminderPayload,
  type VendorQuotePayload,
} from "@/lib/assistant/proposals";
import type { SeatingPlanPayload } from "@/lib/seating/auto-seat";
import { sendEmail } from "@/lib/email/send";
import { buildRsvpReminderEmail } from "@/lib/email/rsvp-reminder";
import { appOrigin } from "@/lib/url";
import { isCanonicalPhase, phaseFromMonthsBefore } from "@/lib/checklist-phases";
import { wholeMonthsBetween } from "@/lib/date-months";
import { createClient } from "@/utils/supabase/server";

export type ProposalActionResult = { ok: true } | { ok: false; error: string };

type ProposalRow = {
  id: string;
  project_id: string;
  kind: string;
  status: string;
  payload:
    | BudgetProposalPayload
    | VendorQuotePayload
    | ChecklistReplanPayload
    | RsvpReminderPayload
    | SeatingPlanPayload
    | null;
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
  if (proposal.kind === "vendor_quote") {
    return applyVendorQuote(supabase, proposal, user.id);
  }
  if (proposal.kind === "checklist_replan") {
    return applyChecklistReplan(supabase, proposal, user.id);
  }
  if (proposal.kind === "seating_plan") {
    return applySeatingPlan(supabase, proposal, user.id);
  }
  if (proposal.kind === "rsvp_reminder") {
    return applyRsvpReminder(supabase, proposal, user.id, user.email ?? null);
  }
  if (proposal.kind !== "budget_change") {
    return { ok: false, error: "This proposal type can't be applied yet." };
  }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }

  const changes = (
    (proposal.payload as BudgetProposalPayload | null)?.changes ?? []
  ).filter(isBudgetChange);
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

/**
 * AGENTIC-03: save an approved vendor quote onto the project vendor.
 * quoted_price is only set when the vendor gave a flat total; per-person,
 * hourly and "starting at" prices stay in quote_details so budget math never
 * treats them as a total.
 */
async function applyVendorQuote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposal: ProposalRow,
  userId: string,
): Promise<ProposalActionResult> {
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }
  const payload = proposal.payload as VendorQuotePayload | null;
  if (!payload?.projectVendorId || !payload.quote) {
    return { ok: false, error: "This proposal has no quote." };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("assistant_proposals")
    .update({
      status: "applied",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("id", proposal.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This proposal was already handled." };

  const { quote } = payload;
  const updates: Record<string, unknown> = {
    quote_details: {
      ...quote,
      outreachMessageId: payload.outreachMessageId,
      approvedAt: new Date().toISOString(),
    },
  };
  if (quote.price !== null && quote.priceBasis === "total") {
    updates.quoted_price = quote.price;
  }

  const { data: updated, error: updateError } = await supabase
    .from("project_vendors")
    .update(updates)
    .eq("id", payload.projectVendorId)
    .eq("project_id", proposal.project_id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await failProposal(
      supabase,
      proposal.id,
      updateError?.message ?? "Vendor not found on this wedding.",
      userId,
    );
    revalidatePath(`/projects/${proposal.project_id}`, "layout");
    return { ok: false, error: "Could not save this quote. Try again from the vendor's page." };
  }

  revalidatePath(`/projects/${proposal.project_id}`, "layout");
  revalidatePath(`/projects/${proposal.project_id}/vendors`);
  return { ok: true };
}

/**
 * AGENTIC-05: apply a checklist replan. Stale check first (a task that was
 * completed or re-dated since the proposal fails the whole thing), then an
 * atomic claim, then the writes. Phase follows the new due date only when
 * the task already sits in a canonical phase, so custom phases survive.
 */
async function applyChecklistReplan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposal: ProposalRow,
  userId: string,
): Promise<ProposalActionResult> {
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }
  const changes = ((proposal.payload as ChecklistReplanPayload | null)?.changes ?? []).filter(
    (c) => c && (c.op === "set_due" || c.op === "add_task"),
  );
  if (changes.length === 0) return { ok: false, error: "This proposal has no changes." };

  const { data: project } = await supabase
    .from("projects")
    .select("wedding_date")
    .eq("id", proposal.project_id)
    .maybeSingle();
  const weddingDate = (project?.wedding_date as string | null) ?? null;

  const taskIds = changes.flatMap((c) => (c.op === "set_due" ? [c.taskId] : []));
  const current = new Map<string, { status: string; due_date: string | null; phase: string | null }>();
  if (taskIds.length > 0) {
    const { data: rows, error: rowsError } = await supabase
      .from("tasks")
      .select("id, status, due_date, phase")
      .eq("project_id", proposal.project_id)
      .in("id", taskIds);
    if (rowsError) return { ok: false, error: rowsError.message };
    for (const row of rows ?? []) {
      current.set(row.id as string, {
        status: row.status as string,
        due_date: (row.due_date as string | null) ?? null,
        phase: (row.phase as string | null) ?? null,
      });
    }
  }
  for (const change of changes) {
    if (change.op !== "set_due") continue;
    const now = current.get(change.taskId);
    if (!now || now.status === "done" || now.due_date !== change.from) {
      const message =
        "Your checklist changed since this was proposed. Ask the assistant to propose it again.";
      await failProposal(supabase, proposal.id, message, userId);
      revalidatePath(`/projects/${proposal.project_id}`, "layout");
      return { ok: false, error: message };
    }
  }

  const { data: claimed, error: claimError } = await supabase
    .from("assistant_proposals")
    .update({ status: "applied", resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", proposal.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This proposal was already handled." };

  try {
    for (const change of changes) {
      if (change.op === "set_due") {
        const updates: Record<string, string> = { due_date: change.to };
        const existing = current.get(change.taskId);
        if (weddingDate && existing?.phase && isCanonicalPhase(existing.phase)) {
          updates.phase = phaseFromMonthsBefore(wholeMonthsBetween(change.to, weddingDate));
        }
        const { error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", change.taskId)
          .eq("project_id", proposal.project_id);
        if (error) throw error;
      } else {
        const phase = weddingDate
          ? phaseFromMonthsBefore(wholeMonthsBetween(change.due, weddingDate))
          : null;
        await addTask(proposal.project_id, phase, change.title, change.due);
      }
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not apply every change.";
    await failProposal(supabase, proposal.id, message, userId);
    revalidatePath(`/projects/${proposal.project_id}`, "layout");
    return {
      ok: false,
      error:
        "Some changes may have applied before something went wrong. Check the Checklist, then ask the assistant to redo the rest.",
    };
  }

  revalidatePath(`/projects/${proposal.project_id}`, "layout");
  revalidatePath(`/projects/${proposal.project_id}/checklist`);
  revalidatePath(`/projects/${proposal.project_id}/calendar`);
  return { ok: true };
}

/**
 * AGENTIC-07: seat the proposed people in one insert. Stale check first:
 * every person must still be unseated, every table must still exist with
 * the seat free. Anything that moved since the proposal fails the whole
 * plan, so nobody is ever double-seated or bumped.
 */
async function applySeatingPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposal: ProposalRow,
  userId: string,
): Promise<ProposalActionResult> {
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }
  const placements = (proposal.payload as SeatingPlanPayload | null)?.placements ?? [];
  if (placements.length === 0) return { ok: false, error: "This plan has no seats." };

  const tableIds = [...new Set(placements.map((p) => p.tableId))];
  const memberIds = placements.map((p) => p.memberId);

  const [tablesResult, taken, seatedAlready, membersResult] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("id, seat_count, kind")
      .eq("project_id", proposal.project_id)
      .in("id", tableIds),
    supabase
      .from("seating_assignments")
      .select("table_id, seat_index")
      .eq("project_id", proposal.project_id)
      .in("table_id", tableIds),
    supabase
      .from("seating_assignments")
      .select("guest_member_id")
      .eq("project_id", proposal.project_id)
      .in("guest_member_id", memberIds),
    supabase
      .from("guest_members")
      .select("id")
      .eq("project_id", proposal.project_id)
      .in("id", memberIds),
  ]);
  for (const r of [tablesResult, taken, seatedAlready, membersResult]) {
    if (r.error) return { ok: false, error: r.error.message };
  }

  const tableById = new Map((tablesResult.data ?? []).map((t) => [t.id as string, t]));
  const takenKeys = new Set(
    (taken.data ?? []).map((a) => `${a.table_id}:${a.seat_index}`),
  );
  const existingMembers = new Set((membersResult.data ?? []).map((m) => m.id as string));

  let stale = (seatedAlready.data ?? []).length > 0;
  for (const p of placements) {
    const table = tableById.get(p.tableId);
    if (
      !table ||
      table.kind !== "standard" ||
      p.seatIndex < 1 ||
      p.seatIndex > Number(table.seat_count) ||
      takenKeys.has(`${p.tableId}:${p.seatIndex}`) ||
      !existingMembers.has(p.memberId)
    ) {
      stale = true;
      break;
    }
  }
  if (stale) {
    const message =
      "Your seating or guest list changed since this was proposed. Ask the assistant to propose it again.";
    await failProposal(supabase, proposal.id, message, userId);
    revalidatePath(`/projects/${proposal.project_id}`, "layout");
    return { ok: false, error: message };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("assistant_proposals")
    .update({ status: "applied", resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", proposal.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This proposal was already handled." };

  // One statement: all seats or none.
  const { error: insertError } = await supabase.from("seating_assignments").insert(
    placements.map((p) => ({
      project_id: proposal.project_id,
      table_id: p.tableId,
      guest_member_id: p.memberId,
      seat_index: p.seatIndex,
    })),
  );
  if (insertError) {
    await failProposal(supabase, proposal.id, insertError.message, userId);
    revalidatePath(`/projects/${proposal.project_id}`, "layout");
    return {
      ok: false,
      error: "Couldn't seat everyone (the seating changed). Nothing was moved; ask the assistant to propose it again.",
    };
  }

  revalidatePath(`/projects/${proposal.project_id}`, "layout");
  revalidatePath(`/projects/${proposal.project_id}/seating`);
  return { ok: true };
}

/**
 * RSVP-CHASE-01: send approved reminders. Everything that matters is
 * re-read at send time (email, token, still pending, cooldown) so a guest
 * who RSVPed or was reminded since the proposal is skipped, not re-mailed.
 * Individual emails, Reply-To the approving member, never a group send.
 */
async function applyRsvpReminder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  proposal: ProposalRow,
  userId: string,
  userEmail: string | null,
): Promise<ProposalActionResult> {
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }
  const payload = proposal.payload as RsvpReminderPayload | null;
  const ids = (payload?.recipients ?? []).map((r) => r.guestId);
  if (!payload || ids.length === 0) {
    return { ok: false, error: "This proposal has no recipients." };
  }

  const { data: site } = await supabase
    .from("wedding_websites")
    .select("slug, published")
    .eq("project_id", proposal.project_id)
    .maybeSingle();
  if (!site?.published || !site.slug) {
    return {
      ok: false,
      error: "The wedding website isn't published, so the RSVP link wouldn't work. Publish it first.",
    };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("assistant_proposals")
    .update({ status: "applied", resolved_at: new Date().toISOString(), resolved_by: userId })
    .eq("id", proposal.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, error: "This proposal was already handled." };

  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select(
      "id, email, rsvp_status, rsvp_token, last_reminded_at, guest_members ( name, sort_order )",
    )
    .eq("project_id", proposal.project_id)
    .in("id", ids);
  if (guestsError) {
    await failProposal(supabase, proposal.id, guestsError.message, userId);
    return { ok: false, error: guestsError.message };
  }

  const cutoff = Date.now() - RSVP_REMINDER_COOLDOWN_DAYS * 86_400_000;
  const base = `${appOrigin()}/w/${encodeURIComponent(site.slug)}/rsvp`;
  const eligible = (guests ?? []).filter((g) => {
    const email = (g.email as string | null)?.trim();
    const last = g.last_reminded_at ? new Date(g.last_reminded_at as string).getTime() : null;
    return g.rsvp_status === "pending" && email && (last === null || last <= cutoff);
  });
  const skipped = ids.length - eligible.length;

  const sentIds: string[] = [];
  let failed = 0;
  for (let i = 0; i < eligible.length; i += 5) {
    const batch = eligible.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (g) => {
        const members = (Array.isArray(g.guest_members) ? g.guest_members : []) as {
          name: string | null;
          sort_order: number | null;
        }[];
        const email = buildRsvpReminderEmail({
          firstName: firstNameFor(members),
          message: payload.message,
          coupleNames: payload.coupleNames,
          rsvpUrl: `${base}?g=${encodeURIComponent(String(g.rsvp_token))}`,
        });
        try {
          const sent = await sendEmail({
            to: String(g.email).trim(),
            subject: email.subject,
            text: email.text,
            html: email.html,
            ...(userEmail ? { replyTo: userEmail } : {}),
          });
          return sent.ok ? (g.id as string) : null;
        } catch {
          return null;
        }
      }),
    );
    for (const id of results) {
      if (id) sentIds.push(id);
      else failed += 1;
    }
  }

  if (sentIds.length > 0) {
    await supabase
      .from("guests")
      .update({ last_reminded_at: new Date().toISOString() })
      .in("id", sentIds)
      .eq("project_id", proposal.project_id);
  }
  revalidatePath(`/projects/${proposal.project_id}`, "layout");
  revalidatePath(`/projects/${proposal.project_id}/guests`);

  if (sentIds.length === 0) {
    const message =
      eligible.length === 0
        ? "Nobody was left to remind (they may have RSVPed or been reminded already)."
        : "No reminders could be sent. Try again in a moment.";
    await failProposal(supabase, proposal.id, message, userId);
    return { ok: false, error: message };
  }
  if (failed > 0) {
    return {
      ok: false,
      error: `Sent ${sentIds.length} of ${eligible.length} reminders; ${failed} failed. Skipped ${skipped}.`,
    };
  }
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
