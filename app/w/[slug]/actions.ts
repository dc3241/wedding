"use server";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 1000;
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX = 10;

export type SubmitRsvpInput = {
  slug: string;
  name: string;
  response: string;
  partySize: number;
  email?: string;
  message?: string;
  honeypot?: string;
};

function isLightEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitRsvp(
  input: SubmitRsvpInput,
): Promise<{ ok: true } | { ok: false }> {
  if (input.honeypot?.trim()) {
    return { ok: true };
  }

  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false };
  }

  const name = input.name.trim();
  if (!name || name.length > NAME_MAX) {
    return { ok: false };
  }

  const response = input.response === "yes" || input.response === "no" ? input.response : null;
  if (!response) {
    return { ok: false };
  }

  const partySize = Math.min(20, Math.max(1, Math.floor(Number(input.partySize)) || 1));

  const emailRaw = input.email?.trim() ?? "";
  if (emailRaw.length > EMAIL_MAX) {
    return { ok: false };
  }
  if (emailRaw && !isLightEmail(emailRaw)) {
    return { ok: false };
  }

  const messageRaw = input.message?.trim() ?? "";
  if (messageRaw.length > MESSAGE_MAX) {
    return { ok: false };
  }

  const supabase = createAnonServerClient();

  const { data: website, error: lookupError } = await supabase
    .from("wedding_websites")
    .select("project_id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError || !website?.project_id) {
    return { ok: false };
  }

  const projectId = String(website.project_id);

  // Soft spam mitigation (best-effort): anon has no SELECT on rsvp_submissions under RLS,
  // so this count cannot succeed today — it no-ops when denied. Real backstop is in-app review.
  const windowStart = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("rsvp_submissions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", windowStart);

  if (count !== null && count >= THROTTLE_MAX) {
    return { ok: false };
  }

  const { error: insertError } = await supabase.from("rsvp_submissions").insert({
    project_id: projectId,
    name,
    response,
    party_size: partySize,
    email: emailRaw || null,
    message: messageRaw || null,
  });

  if (insertError) {
    return { ok: false };
  }

  return { ok: true };
}
