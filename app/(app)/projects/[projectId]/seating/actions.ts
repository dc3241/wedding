"use server";

import { revalidatePath } from "next/cache";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
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
