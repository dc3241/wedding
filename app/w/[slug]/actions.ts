"use server";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 1000;
const DIETARY_MAX = 500;
const FULL_NAME_MAX = 120;
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX = 10;

export type SubmitRsvpAttendeeInput = {
  name?: string;
  meal_option_id?: string | null;
  dietary_note?: string;
};

export type SubmitRsvpInput = {
  slug: string;
  name: string;
  response: string;
  partySize: number;
  email?: string;
  message?: string;
  honeypot?: string;
  attendees?: SubmitRsvpAttendeeInput[];
  householdToken?: string | null;
};

export type RsvpHouseholdMatch = {
  householdToken: string;
  partyLabel: string;
  partySize: number;
};

function isLightEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAttendees(
  attendees: SubmitRsvpAttendeeInput[] | undefined,
): Array<{
  name: string | null;
  meal_option_id: string | null;
  dietary_note: string | null;
}> {
  if (!attendees?.length) return [];

  return attendees.map((row) => {
    const rawName = row.name?.trim() ?? "";
    const name = rawName ? rawName.slice(0, NAME_MAX) : null;
    const rawDietary = row.dietary_note?.trim() ?? "";
    const dietary = rawDietary ? rawDietary.slice(0, DIETARY_MAX) : null;
    const mealId = row.meal_option_id?.trim() || null;

    return {
      name,
      meal_option_id: mealId,
      dietary_note: dietary,
    };
  });
}

export async function lookupRsvpHousehold(
  slug: string,
  opts: { token?: string; fullName?: string } = {},
): Promise<RsvpHouseholdMatch[]> {
  const trimmedSlug = slug.trim();
  if (!trimmedSlug) return [];

  const token = opts.token?.trim() || null;
  const fullNameRaw = opts.fullName?.trim() ?? "";
  const fullName =
    fullNameRaw.length >= 2 ? fullNameRaw.slice(0, FULL_NAME_MAX) : null;

  if (!token && !fullName) return [];

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("lookup_rsvp_household", {
    p_slug: trimmedSlug,
    p_token: token,
    p_full_name: fullName,
  });

  if (error || !data) return [];

  return (data as Array<{
    household_token: string;
    party_label: string;
    party_size: number;
  }>).map((row) => ({
    householdToken: String(row.household_token),
    partyLabel: String(row.party_label),
    partySize: Math.max(1, Number(row.party_size) || 1),
  }));
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

  const householdToken = input.householdToken?.trim() || null;

  const attendees = normalizeAttendees(input.attendees);

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

  const { error: rpcError } = await supabase.rpc("submit_rsvp", {
    p_slug: slug,
    p_name: name,
    p_response: response,
    p_email: emailRaw || null,
    p_message: messageRaw || null,
    p_party_size: partySize,
    p_attendees: attendees,
    p_household_token: householdToken,
  });

  if (rpcError) {
    return { ok: false };
  }

  return { ok: true };
}
