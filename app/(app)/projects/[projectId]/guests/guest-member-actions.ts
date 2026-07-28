"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export async function addGuestMember(
  guestId: string,
  fields: {
    name?: string;
    meal_option_id?: string | null;
    dietary_note?: string;
    attending?: boolean;
    sort_order?: number;
  },
) {
  const supabase = await createClient();

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, project_id")
    .eq("id", guestId)
    .single();

  if (guestError) throw guestError;

  const { count } = await supabase
    .from("guest_members")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", guestId);

  const { error } = await supabase.from("guest_members").insert({
    project_id: guest.project_id,
    guest_id: guestId,
    name: fields.name?.trim() || null,
    meal_option_id: fields.meal_option_id?.trim() || null,
    dietary_note: fields.dietary_note?.trim() || null,
    attending: fields.attending ?? true,
    sort_order:
      fields.sort_order === undefined
        ? count ?? 0
        : Math.floor(Number(fields.sort_order) || 0),
  });

  if (error) throw error;

  revalidatePath(guestsPath(guest.project_id));
}

export async function updateGuestMember(
  id: string,
  fields: {
    name?: string | null;
    meal_option_id?: string | null;
    dietary_note?: string | null;
    attending?: boolean;
    sort_order?: number;
  },
) {
  const updates: Record<string, string | number | boolean | null> = {};

  if (fields.name !== undefined) {
    updates.name =
      fields.name === null ? null : fields.name.trim() || null;
  }
  if (fields.meal_option_id !== undefined) {
    updates.meal_option_id = fields.meal_option_id?.trim() || null;
  }
  if (fields.dietary_note !== undefined) {
    updates.dietary_note =
      fields.dietary_note === null
        ? null
        : fields.dietary_note.trim() || null;
  }
  if (fields.attending !== undefined) {
    updates.attending = Boolean(fields.attending);
  }
  if (fields.sort_order !== undefined) {
    updates.sort_order = Math.floor(Number(fields.sort_order) || 0);
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_members")
    .update(updates)
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}

export async function deleteGuestMember(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_members")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}

export type MatchSubmissionResult =
  | { ok: true }
  | { ok: false; reason: "already_matched" }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error" };

export async function matchSubmissionToGuest(
  submissionId: string,
  guestId: string,
): Promise<MatchSubmissionResult> {
  const supabase = await createClient();

  const { data: submission, error: submissionError } = await supabase
    .from("rsvp_submissions")
    .select("id, project_id, response, matched_guest_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) return { ok: false, reason: "error" };
  if (!submission) return { ok: false, reason: "not_found" };

  if (submission.matched_guest_id) {
    return { ok: false, reason: "already_matched" };
  }

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, project_id")
    .eq("id", guestId)
    .maybeSingle();

  if (guestError) return { ok: false, reason: "error" };
  if (!guest || guest.project_id !== submission.project_id) {
    return { ok: false, reason: "not_found" };
  }

  const rsvpStatus =
    submission.response === "yes"
      ? "attending"
      : submission.response === "no"
        ? "declined"
        : null;

  if (!rsvpStatus) return { ok: false, reason: "error" };

  const { data: updated, error: matchError } = await supabase
    .from("rsvp_submissions")
    .update({ matched_guest_id: guestId })
    .eq("id", submissionId)
    .is("matched_guest_id", null)
    .select("id")
    .maybeSingle();

  if (matchError) return { ok: false, reason: "error" };
  if (!updated) return { ok: false, reason: "already_matched" };

  const { error: statusError } = await supabase
    .from("guests")
    .update({ rsvp_status: rsvpStatus })
    .eq("id", guestId);

  if (statusError) return { ok: false, reason: "error" };

  const { data: attendees, error: attendeesError } = await supabase
    .from("rsvp_attendees")
    .select("name, meal_option_id, dietary_note, sort_order")
    .eq("submission_id", submissionId)
    .order("sort_order", { ascending: true });

  if (attendeesError) return { ok: false, reason: "error" };

  if (attendees && attendees.length > 0) {
    const { count } = await supabase
      .from("guest_members")
      .select("*", { count: "exact", head: true })
      .eq("guest_id", guestId);

    const baseOrder = count ?? 0;
    const rows = attendees.map((attendee, index) => ({
      project_id: submission.project_id,
      guest_id: guestId,
      name: attendee.name?.trim() || null,
      meal_option_id: attendee.meal_option_id ?? null,
      dietary_note: attendee.dietary_note?.trim() || null,
      attending: true,
      sort_order: baseOrder + index,
    }));

    const { error: insertError } = await supabase
      .from("guest_members")
      .insert(rows);

    if (insertError) return { ok: false, reason: "error" };
  }

  revalidatePath(guestsPath(submission.project_id));
  return { ok: true };
}

export async function unmatchSubmission(
  submissionId: string,
): Promise<{ ok: true } | { ok: false }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rsvp_submissions")
    .update({ matched_guest_id: null })
    .eq("id", submissionId)
    .select("project_id")
    .single();

  if (error) return { ok: false };

  revalidatePath(guestsPath(data.project_id));
  return { ok: true };
}
