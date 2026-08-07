import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";

export const SEATING_TABLE_SHAPES = ["round", "square", "rectangle"] as const;

export type SeatingTableShape = (typeof SEATING_TABLE_SHAPES)[number];

/** Seatable table kinds shown in the Kind picker. */
export const SEATING_TABLE_KINDS = ["standard", "sweetheart", "head"] as const;

export type SeatingSeatableKind = (typeof SEATING_TABLE_KINDS)[number];

/** All floor-plan element kinds stored on seating_tables.kind. */
export type SeatingTableKind = SeatingSeatableKind | "dancefloor";

export const DEFAULT_SEAT_COUNT_BY_SHAPE: Record<SeatingTableShape, number> = {
  round: 8,
  square: 4,
  rectangle: 8,
};

export const SEAT_COUNT_MIN = 1;
export const SEAT_COUNT_MAX = 20;

export type SeatingTable = {
  id: string;
  label: string;
  shape: SeatingTableShape;
  seat_count: number;
  kind: SeatingTableKind;
  pos_x: number;
  pos_y: number;
  rotation: number;
};

/** Member-grain seating row. guest_id is write-dead and not selected. */
export type SeatingAssignment = {
  id: string;
  table_id: string;
  guest_member_id: string;
  seat_index: number | null;
};

/** One guest_members person + household cue for the seating roster. */
export type RosterPerson = {
  id: string;
  name: string | null;
  guest_id: string;
  household_name: string | null;
  household_label: string | null;
  relationship: string | null;
  rsvp_status: RsvpStatus;
};

export const CANVAS_WIDTH = 1200;
// Provisional work-area height — re-tuned once seats render as numbered
// positions in the later per-seat rework. Width and table geometry stay put.
export const CANVAS_HEIGHT = 800;

export const NUDGE_STEP = 15;
export const NUDGE_FINE_STEP = 3;

export function isSeatingTableShape(value: string): value is SeatingTableShape {
  return (SEATING_TABLE_SHAPES as readonly string[]).includes(value);
}

export function isSeatingTableKind(value: string): value is SeatingSeatableKind {
  return (SEATING_TABLE_KINDS as readonly string[]).includes(value);
}

export function isDancefloor(kind: SeatingTableKind) {
  return kind === "dancefloor";
}

export function isSeatableTable(table: Pick<SeatingTable, "kind">) {
  return !isDancefloor(table.kind);
}

export function seatingShapeLabel(shape: SeatingTableShape) {
  switch (shape) {
    case "round":
      return "Round";
    case "square":
      return "Square";
    case "rectangle":
      return "Rectangle";
  }
}

export function seatingKindLabel(kind: SeatingSeatableKind) {
  switch (kind) {
    case "standard":
      return "Standard";
    case "sweetheart":
      return "Sweetheart";
    case "head":
      return "Head";
  }
}

export function formatPersonName(person: {
  name: string | null;
  household_name: string | null;
}): string {
  const name = person.name?.trim();
  if (name) return name;
  const household = person.household_name?.trim();
  return household ? household : "Unnamed guest";
}

/** Assignable = household badge not declined (pending + attending). */
export function isAssignableRsvpStatus(status: RsvpStatus) {
  return status !== "declined";
}
