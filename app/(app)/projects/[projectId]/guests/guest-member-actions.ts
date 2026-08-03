"use server";

import { revalidatePath } from "next/cache";
import { isGuestRelationship } from "@/lib/guest-relationships";
import {
  isPartnerSideToken,
  type PartnerSideToken,
} from "@/lib/partner-sides";
import { createClient } from "@/utils/supabase/server";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

function normalizeRelationship(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isGuestRelationship(trimmed)) {
    throw new Error(`Invalid relationship: ${trimmed}`);
  }
  return trimmed;
}

function normalizeRelationshipSide(
  value: string | null | undefined,
): PartnerSideToken | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isPartnerSideToken(trimmed)) {
    throw new Error(`Invalid relationship_side: ${trimmed}`);
  }
  return trimmed;
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
    attending: fields.attending ?? false,
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
    relationship_side?: string | null;
    relationship?: string | null;
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
  if (fields.relationship_side !== undefined) {
    updates.relationship_side = normalizeRelationshipSide(
      fields.relationship_side,
    );
  }
  if (fields.relationship !== undefined) {
    updates.relationship = normalizeRelationship(fields.relationship);
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
