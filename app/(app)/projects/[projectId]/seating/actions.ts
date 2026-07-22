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
    .eq("project_id", projectId);

  if (error) throw error;

  return `Table ${(count ?? 0) + 1}`;
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
    .select("project_id")
    .eq("id", tableId)
    .maybeSingle();

  if (readError) throw readError;
  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }

  // Occupancy is COUNT of assignment rows (seat_index is null today).
  const { count, error: countError } = await supabase
    .from("seating_assignments")
    .select("*", { count: "exact", head: true })
    .eq("table_id", tableId);

  if (countError) throw countError;

  const occupancyCount = count ?? 0;
  if (occupancyCount > next) {
    return {
      ok: false,
      error: `This table has ${occupancyCount} guests assigned. Remove at least ${occupancyCount - next} before reducing to ${next} seats.`,
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

export async function assignGuestToTable(
  projectId: string,
  input: { guestId: string; tableId: string },
): Promise<AssignResult> {
  const supabase = await createClient();

  // Derive project scope from the table itself (RLS-scoped read), rather than
  // trusting the client-sent projectId for the written row.
  const { data: table, error: tableError } = await supabase
    .from("seating_tables")
    .select("id, label, seat_count, project_id")
    .eq("id", input.tableId)
    .maybeSingle();

  if (tableError) throw tableError;
  if (!table) {
    return { ok: false, error: "That table no longer exists." };
  }

  // OCCUPANCY (value validation, not a permission filter). Count assignments
  // already at this table, excluding this guest so a re-seat onto the same
  // table doesn't count them twice.
  const { count, error: countError } = await supabase
    .from("seating_assignments")
    .select("*", { count: "exact", head: true })
    .eq("table_id", table.id)
    .neq("guest_id", input.guestId);

  if (countError) throw countError;

  if ((count ?? 0) >= table.seat_count) {
    return {
      ok: false,
      error: `${table.label} is full (${table.seat_count} seats).`,
    };
  }

  // ALREADY-SEATED -> MOVE: unique(project_id, guest_id) means an upsert on
  // that pair reseats the guest (clearing seat_index) instead of duplicating.
  const { error } = await supabase
    .from("seating_assignments")
    .upsert(
      {
        project_id: table.project_id,
        table_id: table.id,
        guest_id: input.guestId,
        seat_index: null,
      },
      { onConflict: "project_id,guest_id" },
    );

  if (error) throw error;

  revalidatePath(seatingPath(table.project_id));
  return { ok: true };
}

export async function unassignGuest(assignmentId: string) {
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
