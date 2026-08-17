"use server";

import { revalidatePath } from "next/cache";
import {
  isGuestRelationship,
} from "@/lib/guest-relationships";
import {
  isPartnerSideToken,
  type PartnerSideToken,
} from "@/lib/partner-sides";
import { createClient } from "@/utils/supabase/server";
import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isGuestMemberType,
  type GuestMemberType,
  type RsvpStatus,
} from "./types";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export type GuestPersonWrite = {
  name: string;
  relationship_side?: string | null;
  relationship?: string | null;
};

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

function normalizeMemberType(
  value: string | null | undefined,
): GuestMemberType {
  const trimmed = (value ?? "adult").trim() || "adult";
  if (!isGuestMemberType(trimmed)) {
    throw new Error(`Invalid member_type: ${trimmed}`);
  }
  return trimmed;
}

export async function addGuest(
  projectId: string,
  fullName: string,
  household: string,
  phone: string,
  partySize: number,
  additionalPeople: GuestPersonWrite[] = [],
  address = "",
  primary: Omit<GuestPersonWrite, "name"> = {},
  options: {
    member_type?: string | null;
    primaryMemberId?: string | null;
    client?: SupabaseClient;
  } = {},
) {
  const trimmedName = fullName.trim();
  if (!trimmedName) return;

  const memberType = normalizeMemberType(options.member_type);
  const primaryMemberId = options.primaryMemberId?.trim() || null;

  const supabase = await clientForWrite(options.client);

  // Associated path: join an existing unassociated-adult primary's household.
  // Structurally blocks chains (target must be adult + related_to IS NULL).
  if (primaryMemberId) {
    const { data: primaryMember, error: primaryError } = await supabase
      .from("guest_members")
      .select("id, guest_id, project_id, member_type, related_to_member_id")
      .eq("id", primaryMemberId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (primaryError) throw primaryError;
    if (!primaryMember) {
      throw new Error("Primary member not found in this project.");
    }
    if (
      primaryMember.member_type !== "adult" ||
      primaryMember.related_to_member_id != null
    ) {
      throw new Error(
        "Guest of target must be an unassociated adult in this project.",
      );
    }

    const { count } = await supabase
      .from("guest_members")
      .select("*", { count: "exact", head: true })
      .eq("guest_id", primaryMember.guest_id);

    const { error: memberError } = await supabase.from("guest_members").insert({
      project_id: projectId,
      guest_id: primaryMember.guest_id,
      name: trimmedName,
      meal_option_id: null,
      dietary_note: null,
      attending: false,
      sort_order: count ?? 0,
      relationship_side: normalizeRelationshipSide(primary.relationship_side),
      relationship: normalizeRelationship(primary.relationship),
      member_type: memberType,
      related_to_member_id: primaryMember.id,
    });

    if (memberError) throw memberError;

    revalidatePath(guestsPath(projectId));
    return;
  }

  const people: GuestPersonWrite[] = [
    {
      name: trimmedName,
      relationship_side: primary.relationship_side,
      relationship: primary.relationship,
    },
    ...additionalPeople
      .map((person) => ({
        name: person.name.trim(),
        relationship_side: person.relationship_side,
        relationship: person.relationship,
      }))
      .filter((person) => Boolean(person.name)),
  ];

  const { data: guest, error } = await supabase
    .from("guests")
    .insert({
      project_id: projectId,
      full_name: trimmedName,
      household: household.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      party_size: Math.max(1, partySize || 1),
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: membersError } = await supabase.from("guest_members").insert(
    people.map((person, index) => ({
      project_id: projectId,
      guest_id: guest.id,
      name: person.name,
      meal_option_id: null,
      dietary_note: null,
      attending: false,
      sort_order: index,
      relationship_side: normalizeRelationshipSide(person.relationship_side),
      relationship: normalizeRelationship(person.relationship),
      // First person uses the form member_type; additional party adults stay adult.
      member_type: index === 0 ? memberType : "adult",
      related_to_member_id: null,
    })),
  );

  if (membersError) throw membersError;

  revalidatePath(guestsPath(projectId));
}

export async function updateRsvp(
  guestId: string,
  status: RsvpStatus,
  client?: SupabaseClient,
) {
  const supabase = await clientForWrite(client);

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
    address?: string;
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

  if (fields.address !== undefined) {
    updates.address = fields.address.trim() || null;
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
