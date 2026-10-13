"use server";

import { revalidatePath } from "next/cache";
import { friendlyLeadError } from "@/components/leads/friendly-lead-error";
import {
  isLostReason,
  parseLostNote,
  type LostReason,
} from "@/components/leads/lead-lost";
import {
  parseEditableLeadSource,
  parseManualLeadSource,
} from "@/components/leads/lead-source";
import { LEAD_STAGES, type LeadStage } from "@/components/leads/types";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import { parseEventType, type EventType } from "@/lib/event-type";
import { createClient } from "@/utils/supabase/server";

const LEADS_PATH = "/leads";

export type LeadInput = {
  couple_name: string;
  event_type?: EventType;
  contact_email?: string;
  contact_phone?: string;
  wedding_date?: string;
  estimated_budget?: number | null;
  venue?: string;
  source?: string;
  notes?: string;
};

export type LeadUpdateFields = {
  couple_name?: string;
  event_type?: EventType;
  contact_email?: string | null;
  contact_phone?: string | null;
  wedding_date?: string | null;
  estimated_budget?: number | null;
  estimated_guest_count?: number | null;
  venue?: string | null;
  source?: string | null;
  notes?: string | null;
  next_followup_on?: string | null;
  next_followup_action?: string | null;
};

function trimOrNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBudget(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function parseGuestCount(
  value: number | null | undefined,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { ok: true, value: null };
  }
  if (!Number.isInteger(value) || value < 1 || value > 20000) {
    return { ok: false, error: "Guest count must be between 1 and 20,000." };
  }
  return { ok: true, value };
}

const FOLLOWUP_ACTION_MAX = 80;

function parseFollowup(
  date: string | null | undefined,
  action: string | null | undefined,
):
  | { ok: true; date: string | null; action: string | null }
  | { ok: false; error: string } {
  const trimmedDate = date?.trim() ?? "";
  if (!trimmedDate) {
    return { ok: true, date: null, action: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Enter a follow-up date." };
  }
  const trimmedAction = action?.trim() ?? "";
  if (trimmedAction.length > FOLLOWUP_ACTION_MAX) {
    return {
      ok: false,
      error: `Keep the follow-up under ${FOLLOWUP_ACTION_MAX} characters.`,
    };
  }
  return {
    ok: true,
    date: trimmedDate,
    action: trimmedAction || null,
  };
}

function revalidateLead(id?: string) {
  revalidatePath(LEADS_PATH);
  if (id) revalidatePath(`${LEADS_PATH}/${id}`);
}

export async function createLead(
  input: LeadInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const coupleName = input.couple_name.trim();
    if (!coupleName) {
      return { ok: false, error: "Couple name is required." };
    }

    const source = parseManualLeadSource(input.source);
    if (!source.ok) return source;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "No business account found." };
    }

    const { data: membership, error: membershipError } = await supabase
      .from("account_members")
      .select("account_id, accounts!inner(kind)")
      .eq("user_id", user.id)
      .eq("accounts.kind", "business")
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return { ok: false, error: friendlyLeadError(membershipError.message) };
    }

    if (!membership) {
      return { ok: false, error: "No business account found." };
    }

    const { data: created, error } = await supabase
      .from("leads")
      .insert({
        account_id: membership.account_id,
        couple_name: coupleName,
        event_type: parseEventType(input.event_type),
        contact_email: trimOrNull(input.contact_email),
        contact_phone: trimOrNull(input.contact_phone),
        wedding_date: trimOrNull(input.wedding_date),
        estimated_budget: parseBudget(input.estimated_budget),
        venue: trimOrNull(input.venue),
        source: source.value,
        notes: trimOrNull(input.notes),
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        ok: false,
        error: friendlyLeadError(error?.message ?? "Couldn't create lead."),
      };
    }

    await dispatchLeadAutomation({
      accountId: membership.account_id,
      leadId: created.id,
      triggerKind: "lead_created",
    });

    revalidateLead(created.id);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't create lead.";
    return { ok: false, error: friendlyLeadError(message) };
  }
}

export async function updateLead(
  id: string,
  fields: LeadUpdateFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.event_type !== undefined) {
    payload.event_type = parseEventType(fields.event_type);
  }
  if (fields.couple_name !== undefined) {
    const coupleName = fields.couple_name.trim();
    if (!coupleName) {
      return { ok: false, error: "Couple name is required." };
    }
    payload.couple_name = coupleName;
  }
  if (fields.contact_email !== undefined) {
    payload.contact_email = trimOrNull(fields.contact_email);
  }
  if (fields.contact_phone !== undefined) {
    payload.contact_phone = trimOrNull(fields.contact_phone);
  }
  if (fields.wedding_date !== undefined) {
    payload.wedding_date = trimOrNull(fields.wedding_date);
  }
  if (fields.estimated_budget !== undefined) {
    payload.estimated_budget = parseBudget(fields.estimated_budget);
  }
  if (fields.estimated_guest_count !== undefined) {
    const guests = parseGuestCount(fields.estimated_guest_count);
    if (!guests.ok) return guests;
    payload.estimated_guest_count = guests.value;
  }
  if (fields.venue !== undefined) {
    payload.venue = trimOrNull(fields.venue);
  }
  const sourceInput = fields.source;
  if (fields.notes !== undefined) {
    payload.notes = trimOrNull(fields.notes);
  }
  if (
    fields.next_followup_on !== undefined ||
    fields.next_followup_action !== undefined
  ) {
    const followup = parseFollowup(
      fields.next_followup_on,
      fields.next_followup_action,
    );
    if (!followup.ok) return followup;
    payload.next_followup_on = followup.date;
    payload.next_followup_action = followup.action;
  }

  const supabase = await createClient();

  if (sourceInput !== undefined) {
    const { data: current, error: loadError } = await supabase
      .from("leads")
      .select("source")
      .eq("id", id)
      .maybeSingle();
    if (loadError) return { ok: false, error: loadError.message };
    if (!current) return { ok: false, error: "Lead not found." };
    const parsed = parseEditableLeadSource(sourceInput, current.source);
    if (!parsed.ok) return parsed;
    payload.source = parsed.value;
  }

  const { error } = await supabase.from("leads").update(payload).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateLead(id);
  return { ok: true };
}

export async function appendLeadNote(
  id: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const addition = text.trim();
  if (!addition) {
    return { ok: false, error: "Write a note first." };
  }

  const supabase = await createClient();
  const { data: lead, error: loadError } = await supabase
    .from("leads")
    .select("notes")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }
  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const current = typeof lead.notes === "string" ? lead.notes.trim() : "";
  const notes = current ? `${current}\n\n${addition}` : addition;
  const { error } = await supabase
    .from("leads")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateLead(id);
  return { ok: true };
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!LEAD_STAGES.includes(stage)) {
    return { ok: false, error: "Invalid stage." };
  }

  const supabase = await createClient();

  const { data: before, error: loadError } = await supabase
    .from("leads")
    .select("account_id, stage")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }
  if (!before) {
    return { ok: false, error: "Lead not found." };
  }

  if (stage === "lost" && before.stage !== "lost") {
    return { ok: false, error: "Choose why this lead was lost." };
  }

  const patch: Record<string, unknown> = {
    stage,
    updated_at: new Date().toISOString(),
  };
  if (before.stage === "lost" && stage !== "lost") {
    patch.lost_reason = null;
    patch.lost_note = null;
  }

  const { error } = await supabase.from("leads").update(patch).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (before.stage !== stage) {
    await dispatchLeadAutomation({
      accountId: before.account_id,
      leadId: id,
      triggerKind: "lead_stage_changed",
      fromStage: before.stage,
      toStage: stage,
    });
  }

  revalidatePath(LEADS_PATH);
  return { ok: true };
}

export async function deleteLead(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(LEADS_PATH);
  return { ok: true };
}

export type ReorderLeadItem = {
  id: string;
  stage: LeadStage;
  position: number;
  lostReason?: LostReason;
  lostNote?: string | null;
};

export async function reorderLeads(
  items: ReorderLeadItem[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const item of items) {
    if (!LEAD_STAGES.includes(item.stage)) {
      return { ok: false, error: "Invalid stage." };
    }
  }

  if (items.length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  const { data: existingRows, error: loadError } = await supabase
    .from("leads")
    .select("id, account_id, stage")
    .in(
      "id",
      items.map((item) => item.id),
    );

  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  const beforeById = new Map(
    (existingRows ?? []).map((row) => [row.id as string, row]),
  );

  for (const item of items) {
    const before = beforeById.get(item.id);
    if (before && before.stage !== "lost" && item.stage === "lost") {
      if (!isLostReason(item.lostReason)) {
        return { ok: false, error: "Choose why this lead was lost." };
      }
      const note = parseLostNote(item.lostNote);
      if (!note.ok) return note;
    }
  }

  for (const item of items) {
    const before = beforeById.get(item.id);
    const patch: Record<string, unknown> = {
      stage: item.stage,
      position: item.position,
      updated_at: updatedAt,
    };
    if (before && before.stage !== "lost" && item.stage === "lost") {
      const note = parseLostNote(item.lostNote);
      patch.lost_reason = item.lostReason;
      patch.lost_note = note.ok ? note.value : null;
    } else if (before && before.stage === "lost" && item.stage !== "lost") {
      patch.lost_reason = null;
      patch.lost_note = null;
    }

    const { error } = await supabase.from("leads").update(patch).eq("id", item.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const dispatched = new Set<string>();
  for (const item of items) {
    const before = beforeById.get(item.id);
    if (!before || before.stage === item.stage) continue;
    if (dispatched.has(item.id)) continue;
    dispatched.add(item.id);
    await dispatchLeadAutomation({
      accountId: before.account_id,
      leadId: item.id,
      triggerKind: "lead_stage_changed",
      fromStage: before.stage,
      toStage: item.stage,
    });
  }

  revalidatePath(LEADS_PATH);
  return { ok: true };
}
