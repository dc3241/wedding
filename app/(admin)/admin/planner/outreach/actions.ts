"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { isOutreachChannel, type OutreachChannel } from "@/lib/admin/outreach";
import { draftOutreachMessage } from "@/lib/admin/outreach/draft";
import { createClient } from "@/utils/supabase/server";

export type OutreachActionResult = { ok: true } | { ok: false; error: string };

const NAME_MAX = 160;

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) return null;
  return supabase;
}

function revalidate() {
  revalidatePath("/admin/planner/outreach");
}

function cleanName(value: string): string {
  return value.trim().slice(0, NAME_MAX);
}

export async function saveOutreachTarget(
  id: string,
  input: { name: string; channel: string },
): Promise<OutreachActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not authorized." };
  if (!isOutreachChannel(input.channel)) return { ok: false, error: "Pick email or TikTok." };

  const { data: row, error } = await supabase
    .from("outreach_targets")
    .select("id, name, channel")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "That row is gone." };

  const name = cleanName(input.name);
  const channel = input.channel;
  const changed = name !== row.name || channel !== row.channel;
  const { error: updateError } = await supabase
    .from("outreach_targets")
    .update({
      name,
      channel,
      updated_at: new Date().toISOString(),
      ...(changed ? { subject: null, body: null } : {}),
    })
    .eq("id", id);
  if (updateError) return { ok: false, error: updateError.message };
  revalidate();
  return { ok: true };
}

export async function generateOutreachDraft(
  id: string,
  input: { name: string; channel: string },
): Promise<OutreachActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not authorized." };
  if (!isOutreachChannel(input.channel)) return { ok: false, error: "Pick email or TikTok." };

  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Enter a name or TikTok handle first." };

  const { data: row, error } = await supabase
    .from("outreach_targets")
    .select("id, audience, name, channel")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "That row is gone." };
  if (row.audience !== "venue" && row.audience !== "planner") {
    return { ok: false, error: "That row is not a venue or a planner." };
  }

  const channel: OutreachChannel = input.channel;
  const changed = name !== row.name || channel !== row.channel;
  if (changed) {
    const { error: clearError } = await supabase
      .from("outreach_targets")
      .update({
        name,
        channel,
        subject: null,
        body: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (clearError) return { ok: false, error: clearError.message };
  }

  try {
    const draft = await draftOutreachMessage({
      audience: row.audience,
      channel,
      name,
    });
    const { error: writeError } = await supabase
      .from("outreach_targets")
      .update({
        name,
        channel,
        subject: draft.subject,
        body: draft.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (writeError) return { ok: false, error: writeError.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not write that message.";
    revalidate();
    return { ok: false, error: message };
  }

  revalidate();
  return { ok: true };
}

export async function setOutreachSent(id: string, sent: boolean): Promise<OutreachActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "Not authorized." };
  const { error } = await supabase
    .from("outreach_targets")
    .update({
      sent_at: sent ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
