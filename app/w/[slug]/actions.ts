"use server";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 1000;
const DIETARY_MAX = 500;
const SONG_MAX = 200;
const FULL_NAME_MAX = 120;

export type SubmitRsvpAttendeeInput = {
  name?: string;
  meal_option_id?: string | null;
  dietary_note?: string;
  song_request?: string;
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

export type SubmitRsvpResult =
  | { ok: true }
  | { ok: false; reason: "throttled" | "error" };

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
  song_request: string | null;
}> {
  if (!attendees?.length) return [];

  return attendees.map((row) => {
    const rawName = row.name?.trim() ?? "";
    const name = rawName ? rawName.slice(0, NAME_MAX) : null;
    const rawDietary = row.dietary_note?.trim() ?? "";
    const dietary = rawDietary ? rawDietary.slice(0, DIETARY_MAX) : null;
    const rawSong = row.song_request?.trim() ?? "";
    const song = rawSong ? rawSong.slice(0, SONG_MAX) : null;
    const mealId = row.meal_option_id?.trim() || null;

    return {
      name,
      meal_option_id: mealId,
      dietary_note: dietary,
      song_request: song,
    };
  });
}

function isRsvpThrottled(message: string | undefined): boolean {
  return Boolean(message && message.includes("rsvp_throttled"));
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
): Promise<SubmitRsvpResult> {
  if (input.honeypot?.trim()) {
    return { ok: true };
  }

  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false, reason: "error" };
  }

  const name = input.name.trim();
  if (!name || name.length > NAME_MAX) {
    return { ok: false, reason: "error" };
  }

  const response = input.response === "yes" || input.response === "no" ? input.response : null;
  if (!response) {
    return { ok: false, reason: "error" };
  }

  const partySize = Math.min(20, Math.max(1, Math.floor(Number(input.partySize)) || 1));

  const emailRaw = input.email?.trim() ?? "";
  if (emailRaw.length > EMAIL_MAX) {
    return { ok: false, reason: "error" };
  }
  if (emailRaw && !isLightEmail(emailRaw)) {
    return { ok: false, reason: "error" };
  }

  const messageRaw = input.message?.trim() ?? "";
  if (messageRaw.length > MESSAGE_MAX) {
    return { ok: false, reason: "error" };
  }

  const householdToken = input.householdToken?.trim() || null;
  if (!householdToken) {
    return { ok: false, reason: "error" };
  }

  const attendees = normalizeAttendees(input.attendees);

  const supabase = createAnonServerClient();

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
    if (isRsvpThrottled(rpcError.message)) {
      return { ok: false, reason: "throttled" };
    }
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}
