"use server";

import { revalidatePath } from "next/cache";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import { createClient } from "@/utils/supabase/server";
import { LEAD_STAGES, type LeadStage } from "@/components/leads/types";

const LEADS_PATH = "/leads";

export type LeadInput = {
  couple_name: string;
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
  contact_email?: string | null;
  contact_phone?: string | null;
  wedding_date?: string | null;
  estimated_budget?: number | null;
  venue?: string | null;
  source?: string | null;
  notes?: string | null;
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

export async function createLead(
  input: LeadInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const coupleName = input.couple_name.trim();
  if (!coupleName) {
    return { ok: false, error: "Couple name is required." };
  }

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
    return { ok: false, error: membershipError.message };
  }

  if (!membership) {
    return { ok: false, error: "No business account found." };
  }

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      account_id: membership.account_id,
      couple_name: coupleName,
      contact_email: trimOrNull(input.contact_email),
      contact_phone: trimOrNull(input.contact_phone),
      wedding_date: trimOrNull(input.wedding_date),
      estimated_budget: parseBudget(input.estimated_budget),
      venue: trimOrNull(input.venue),
      source: trimOrNull(input.source),
      notes: trimOrNull(input.notes),
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: error?.message ?? "Couldn't create lead." };
  }

  await dispatchLeadAutomation({
    accountId: membership.account_id,
    leadId: created.id,
    triggerKind: "lead_created",
  });

  revalidatePath(LEADS_PATH);
  return { ok: true };
}

export async function updateLead(
  id: string,
  fields: LeadUpdateFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

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
  if (fields.venue !== undefined) {
    payload.venue = trimOrNull(fields.venue);
  }
  if (fields.source !== undefined) {
    payload.source = trimOrNull(fields.source);
  }
  if (fields.notes !== undefined) {
    payload.notes = trimOrNull(fields.notes);
  }

  const supabase = await createClient();

  const { error } = await supabase.from("leads").update(payload).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(LEADS_PATH);
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

  const { error } = await supabase
    .from("leads")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);

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
    const { error } = await supabase
      .from("leads")
      .update({
        stage: item.stage,
        position: item.position,
        updated_at: updatedAt,
      })
      .eq("id", item.id);

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
