export const SEATING_TABLE_SHAPES = ["round", "square", "rectangle"] as const;

export type SeatingTableShape = (typeof SEATING_TABLE_SHAPES)[number];

export const SEATING_TABLE_KINDS = ["standard", "sweetheart", "head"] as const;

export type SeatingTableKind = (typeof SEATING_TABLE_KINDS)[number];

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

export type SeatingAssignment = {
  id: string;
  table_id: string;
  guest_id: string;
  seat_index: number | null;
};

export type RosterGuest = {
  id: string;
  full_name: string | null;
};

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const NUDGE_STEP = 15;
export const NUDGE_FINE_STEP = 3;

export function isSeatingTableShape(value: string): value is SeatingTableShape {
  return (SEATING_TABLE_SHAPES as readonly string[]).includes(value);
}

export function isSeatingTableKind(value: string): value is SeatingTableKind {
  return (SEATING_TABLE_KINDS as readonly string[]).includes(value);
}

export function seatingTableKindLabel(kind: SeatingTableKind) {
  switch (kind) {
    case "standard":
      return "Standard";
    case "sweetheart":
      return "Sweetheart";
    case "head":
      return "Head";
  }
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
