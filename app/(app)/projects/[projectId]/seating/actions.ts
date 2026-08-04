"use server";

import { revalidatePath } from "next/cache";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  isSeatingTableKind,
  isSeatingTableShape,
  SEAT_COUNT_MAX,
  SEAT_COUNT_MIN,
} from "./types";
import { createClient } from "@/utils/supabase/server";

function seatingPath(projectId: string) {
  return `/projects/${projectId}/seating`;
}

function clampSeatCount(value: number) {
  return Math.min(SEAT_COUNT_MAX, Math.max(SEAT_COUNT_MIN, Math.round(value)));
}

function clampPosition(value: number, max: number) {
  return Math.min(max, Math.max(0, value));
}

async function nextTableLabel(projectId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("seating_tables")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .neq("kind", "dancefloor");

  if (error) throw error;

  return `Table ${(count ?? 0) + 1}`;
}

async function nextDancefloorLabel(projectId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("seating_tables")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("kind", "dancefloor");

  if (error) throw error;

  const next = (count ?? 0) + 1;
  return next === 1 ? "Dance floor" : `Dance floor ${next}`;
}

export async function addSeatingTable(
  projectId: string,
  input: {
    shape: string;
    seatCount: number;
    posX: number;
    posY: number;
  },
) {
  if (!isSeatingTableShape(input.shape)) return;

  const supabase = await createClient();

  const { error } = await supabase.from("seating_tables").insert({
    project_id: projectId,
    label: await nextTableLabel(projectId),
    shape: input.shape,
    seat_count: clampSeatCount(input.seatCount),
    kind: "standard",
    pos_x: clampPosition(input.posX, CANVAS_WIDTH),
    pos_y: clampPosition(input.posY, CANVAS_HEIGHT),
    rotation: 0,
  });

  if (error) throw error;

  revalidatePath(seatingPath(projectId));
}

export async function addDancefloor(
  projectId: string,
  input: { posX: number; posY: number },
) {
  const supabase = await createClient();

  const { error } = await supabase.from("seating_tables").insert({
    project_id: projectId,
    label: await nextDancefloorLabel(projectId),
    shape: "rectangle",
    seat_count: 0,
    kind: "dancefloor",
    pos_x: clampPosition(input.posX, CANVAS_WIDTH),
    pos_y: clampPosition(input.posY, CANVAS_HEIGHT),
    rotation: 0,
  });

  if (error) throw error;

  revalidatePath(seatingPath(projectId));
}

export async function deleteSeatingTable(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seating_tables")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
}

export async function moveSeatingTable(
  id: string,
  input: { posX: number; posY: number },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seating_tables")
    .update({
      pos_x: clampPosition(input.posX, CANVAS_WIDTH),
      pos_y: clampPosition(input.posY, CANVAS_HEIGHT),
    })
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
}

export type AssignResult = { ok: true } | { ok: false; error: string };

const ROTATION_STEP = 45;

function normalizeRotation(value: number) {
  return ((value % 360) + 360) % 360;
}

export async function setSeatingTableKind(
  tableId: string,
  kind: string,
): Promise<AssignResult> {
  if (!isSeatingTableKind(kind)) {
    return { ok: false, error: "Unknown table kind." };
  }

  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("seating_tables")
    .select("kind, project_id")
    .eq("id", tableId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) {
    return { ok: false, error: "That table no longer exists." };
  }
  if (existing.kind === "dancefloor") {
    return { ok: false, error: "Dance floors do not have a table kind." };
  }

  const { data, error } = await supabase
    .from("seating_tables")
    .update({ kind })
    .eq("id", tableId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
  return { ok: true };
}

export async function rotateSeatingTable(
  tableId: string,
  direction: "cw" | "ccw",
): Promise<AssignResult> {
  if (direction !== "cw" && direction !== "ccw") {
    return { ok: false, error: "Invalid rotation direction." };
  }

  const supabase = await createClient();

  const { data: table, error: readError } = await supabase
    .from("seating_tables")
    .select("rotation, project_id")
    .eq("id", tableId)
    .maybeSingle();

  if (readError) throw readError;
  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }

  const current = Number(table.rotation);
  const delta = direction === "cw" ? ROTATION_STEP : -ROTATION_STEP;
  const next = normalizeRotation(current + delta);

  const { data, error } = await supabase
    .from("seating_tables")
    .update({ rotation: next })
    .eq("id", tableId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
  return { ok: true };
}

export async function setSeatingTableSeatCount(
  tableId: string,
  seatCount: number,
): Promise<AssignResult> {
  const next = clampSeatCount(seatCount);

  const supabase = await createClient();

  const { data: table, error: readError } = await supabase
    .from("seating_tables")
    .select("kind, project_id")
    .eq("id", tableId)
    .maybeSingle();

  if (readError) throw readError;
  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }
  if (table.kind === "dancefloor") {
    return { ok: false, error: "Dance floors do not have seats." };
  }

  // Occupancy is COUNT of member assignment rows at the table.
  const { count, error: countError } = await supabase
    .from("seating_assignments")
    .select("*", { count: "exact", head: true })
    .eq("table_id", tableId);

  if (countError) throw countError;

  const occupancyCount = count ?? 0;
  if (occupancyCount > next) {
    return {
      ok: false,
      error: `This table has ${occupancyCount} people seated. Remove at least ${occupancyCount - next} before reducing to ${next} seats.`,
    };
  }

  const { data, error } = await supabase
    .from("seating_tables")
    .update({ seat_count: next })
    .eq("id", tableId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
  return { ok: true };
}

function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

function seatTakenMessage(seatIndex: number) {
  return `Seat ${seatIndex} is taken.`;
}

async function readSeatableTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableId: string,
) {
  const { data: table, error } = await supabase
    .from("seating_tables")
    .select("id, label, seat_count, kind, project_id")
    .eq("id", tableId)
    .maybeSingle();

  if (error) throw error;
  return table;
}

export async function assignMemberToSeat(
  memberId: string,
  tableId: string,
  seatIndex: number,
): Promise<AssignResult> {
  if (!Number.isInteger(seatIndex) || seatIndex < 1) {
    return { ok: false, error: "Pick a specific seat number." };
  }

  const supabase = await createClient();
  const table = await readSeatableTable(supabase, tableId);

  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }
  if (table.kind === "dancefloor") {
    return { ok: false, error: "Guests can only be seated at tables." };
  }
  if (seatIndex > table.seat_count) {
    return {
      ok: false,
      error: `${table.label} only has ${table.seat_count} seats.`,
    };
  }

  const { data: member, error: memberError } = await supabase
    .from("guest_members")
    .select("id, project_id")
    .eq("id", memberId)
    .eq("project_id", table.project_id)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) {
    return { ok: false, error: "That person is no longer on the guest list." };
  }

  // Capacity: count others already at this table (exclude this member so a
  // re-seat onto the same table doesn't count twice).
  const { count, error: countError } = await supabase
    .from("seating_assignments")
    .select("*", { count: "exact", head: true })
    .eq("table_id", table.id)
    .neq("guest_member_id", memberId);

  if (countError) throw countError;

  if ((count ?? 0) >= table.seat_count) {
    return {
      ok: false,
      error: `${table.label} is full (${table.seat_count} seats).`,
    };
  }

  // Never write guest_id — member grain only. Upsert on (project_id,
  // guest_member_id) moves an already-seated person to the clicked seat.
  const { error } = await supabase.from("seating_assignments").upsert(
    {
      project_id: table.project_id,
      table_id: table.id,
      guest_member_id: memberId,
      seat_index: seatIndex,
    },
    { onConflict: "project_id,guest_member_id" },
  );

  if (isUniqueViolation(error)) {
    return { ok: false, error: seatTakenMessage(seatIndex) };
  }
  if (error) throw error;

  revalidatePath(seatingPath(table.project_id));
  return { ok: true };
}

/**
 * Breakdown-add helper: place on the lowest free 1-based seat in
 * [1, seat_count]. Matches SEAT-13 canvas numbering (not 0-based).
 */
export async function assignMemberToLowestFreeSeat(
  memberId: string,
  tableId: string,
): Promise<AssignResult> {
  const supabase = await createClient();
  const table = await readSeatableTable(supabase, tableId);

  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }
  if (table.kind === "dancefloor") {
    return { ok: false, error: "Guests can only be seated at tables." };
  }

  const { data: seated, error: seatedError } = await supabase
    .from("seating_assignments")
    .select("seat_index, guest_member_id")
    .eq("table_id", table.id);

  if (seatedError) throw seatedError;

  const used = new Set<number>();
  for (const row of seated ?? []) {
    if (row.guest_member_id === memberId) continue;
    if (row.seat_index == null) continue;
    used.add(Number(row.seat_index));
  }

  let freeSeat: number | null = null;
  for (let seat = 1; seat <= table.seat_count; seat += 1) {
    if (!used.has(seat)) {
      freeSeat = seat;
      break;
    }
  }

  if (freeSeat == null) {
    return {
      ok: false,
      error: `${table.label} is full (${table.seat_count} seats).`,
    };
  }

  return assignMemberToSeat(memberId, tableId, freeSeat);
}

export async function moveMemberToSeat(
  assignmentId: string,
  tableId: string,
  seatIndex: number,
): Promise<AssignResult> {
  if (!Number.isInteger(seatIndex) || seatIndex < 1) {
    return { ok: false, error: "Pick a specific seat number." };
  }

  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("seating_assignments")
    .select("id, table_id, guest_member_id, project_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing) {
    return { ok: false, error: "That seating assignment no longer exists." };
  }

  const table = await readSeatableTable(supabase, tableId);
  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }
  if (table.kind === "dancefloor") {
    return { ok: false, error: "Guests can only be seated at tables." };
  }
  if (seatIndex > table.seat_count) {
    return {
      ok: false,
      error: `${table.label} only has ${table.seat_count} seats.`,
    };
  }
  if (table.project_id !== existing.project_id) {
    return { ok: false, error: "That table is on a different project." };
  }

  if (existing.table_id !== table.id) {
    const { count, error: countError } = await supabase
      .from("seating_assignments")
      .select("*", { count: "exact", head: true })
      .eq("table_id", table.id)
      .neq("guest_member_id", existing.guest_member_id);

    if (countError) throw countError;
    if ((count ?? 0) >= table.seat_count) {
      return {
        ok: false,
        error: `${table.label} is full (${table.seat_count} seats).`,
      };
    }
  }

  const { error } = await supabase
    .from("seating_assignments")
    .update({ table_id: table.id, seat_index: seatIndex })
    .eq("id", assignmentId);

  if (isUniqueViolation(error)) {
    return { ok: false, error: seatTakenMessage(seatIndex) };
  }
  if (error) throw error;

  revalidatePath(seatingPath(existing.project_id));
  return { ok: true };
}

export async function swapSeats(
  assignmentIdA: string,
  assignmentIdB: string,
): Promise<AssignResult> {
  if (assignmentIdA === assignmentIdB) {
    return { ok: false, error: "Pick two different people to swap." };
  }

  const supabase = await createClient();

  const { data: rows, error: readError } = await supabase
    .from("seating_assignments")
    .select("id, table_id, seat_index, project_id")
    .in("id", [assignmentIdA, assignmentIdB]);

  if (readError) throw readError;

  const a = rows?.find((row) => row.id === assignmentIdA);
  const b = rows?.find((row) => row.id === assignmentIdB);
  if (!a || !b) {
    return { ok: false, error: "One of those seats is no longer assigned." };
  }
  if (a.project_id !== b.project_id) {
    return { ok: false, error: "Those seats are on different projects." };
  }

  // Park A on a null seat_index so the partial unique on (table_id, seat_index)
  // doesn't fire mid-swap, then move B into A's seat, then A into B's.
  const { error: parkError } = await supabase
    .from("seating_assignments")
    .update({ seat_index: null })
    .eq("id", a.id);
  if (parkError) throw parkError;

  const { error: moveBError } = await supabase
    .from("seating_assignments")
    .update({ table_id: a.table_id, seat_index: a.seat_index })
    .eq("id", b.id);
  if (isUniqueViolation(moveBError)) {
    // Best-effort restore A.
    await supabase
      .from("seating_assignments")
      .update({ table_id: a.table_id, seat_index: a.seat_index })
      .eq("id", a.id);
    return {
      ok: false,
      error: a.seat_index != null
        ? seatTakenMessage(a.seat_index)
        : "Could not complete the swap.",
    };
  }
  if (moveBError) throw moveBError;

  const { error: moveAError } = await supabase
    .from("seating_assignments")
    .update({ table_id: b.table_id, seat_index: b.seat_index })
    .eq("id", a.id);
  if (isUniqueViolation(moveAError)) {
    return {
      ok: false,
      error: b.seat_index != null
        ? seatTakenMessage(b.seat_index)
        : "Could not complete the swap.",
    };
  }
  if (moveAError) throw moveAError;

  revalidatePath(seatingPath(a.project_id));
  return { ok: true };
}

export async function replaceSeat(
  seatAssignmentId: string,
  newMemberId: string,
): Promise<AssignResult> {
  const supabase = await createClient();

  const { data: seat, error: seatError } = await supabase
    .from("seating_assignments")
    .select("id, table_id, seat_index, guest_member_id, project_id")
    .eq("id", seatAssignmentId)
    .maybeSingle();

  if (seatError) throw seatError;
  if (!seat) {
    return { ok: false, error: "That seat is no longer assigned." };
  }
  if (seat.guest_member_id === newMemberId) {
    return { ok: true };
  }

  const { data: member, error: memberError } = await supabase
    .from("guest_members")
    .select("id")
    .eq("id", newMemberId)
    .eq("project_id", seat.project_id)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) {
    return { ok: false, error: "That person is no longer on the guest list." };
  }

  // Unseat the incoming person if they already occupy another seat.
  const { error: clearError } = await supabase
    .from("seating_assignments")
    .delete()
    .eq("project_id", seat.project_id)
    .eq("guest_member_id", newMemberId)
    .neq("id", seat.id);

  if (clearError) throw clearError;

  // Prior occupant is unseated by transferring this row to the new member.
  const { error } = await supabase
    .from("seating_assignments")
    .update({ guest_member_id: newMemberId })
    .eq("id", seat.id);

  if (isUniqueViolation(error)) {
    return {
      ok: false,
      error:
        seat.seat_index != null
          ? seatTakenMessage(seat.seat_index)
          : "That seat could not be replaced.",
    };
  }
  if (error) throw error;

  revalidatePath(seatingPath(seat.project_id));
  return { ok: true };
}

export async function unseatMember(assignmentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("seating_assignments")
    .delete()
    .eq("id", assignmentId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(seatingPath(data.project_id));
}
