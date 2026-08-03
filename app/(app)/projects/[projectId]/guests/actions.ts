"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { RsvpStatus } from "./types";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export async function addGuest(
  projectId: string,
  fullName: string,
  household: string,
  email: string,
  partySize: number,
  additionalNames: string[] = [],
) {
  const trimmedName = fullName.trim();
  if (!trimmedName) return;

  const supabase = await createClient();

  const { data: guest, error } = await supabase
    .from("guests")
    .insert({
      project_id: projectId,
      full_name: trimmedName,
      household: household.trim() || null,
      email: email.trim() || null,
      party_size: Math.max(1, partySize || 1),
    })
    .select("id")
    .single();

  if (error) throw error;

  const memberNames = [
    trimmedName,
    ...additionalNames.map((n) => n.trim()).filter(Boolean),
  ];

  const { error: membersError } = await supabase.from("guest_members").insert(
    memberNames.map((name, index) => ({
      project_id: projectId,
      guest_id: guest.id,
      name,
      meal_option_id: null,
      dietary_note: null,
      attending: false,
      sort_order: index,
    })),
  );

  if (membersError) throw membersError;

  revalidatePath(guestsPath(projectId));
}

export async function updateRsvp(guestId: string, status: RsvpStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .update({ rsvp_status: status })
    .eq("id", guestId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}

export async function updateGuest(
  guestId: string,
  fields: {
    full_name?: string;
    household?: string;
    email?: string;
    phone?: string;
    party_size?: number;
    notes?: string;
  },
) {
  const updates: Record<string, string | number | null> = {};

  if (fields.full_name !== undefined) {
    const trimmed = fields.full_name.trim();
    if (!trimmed) return;
    updates.full_name = trimmed;
  }

  if (fields.household !== undefined) {
    updates.household = fields.household.trim() || null;
  }

  if (fields.email !== undefined) {
    updates.email = fields.email.trim() || null;
  }

  if (fields.phone !== undefined) {
    updates.phone = fields.phone.trim() || null;
  }

  if (fields.party_size !== undefined) {
    updates.party_size = Math.max(1, fields.party_size || 1);
  }

  if (fields.notes !== undefined) {
    updates.notes = fields.notes.trim() || null;
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .update(updates)
    .eq("id", guestId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}

export async function removeGuest(guestId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .delete()
    .eq("id", guestId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}
