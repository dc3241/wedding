import type { SeatingTableShape } from "./types";

export type TableBody = {
  halfWidth: number;
  halfHeight: number;
};

const ROUND_RADIUS = 48;
const SQUARE_HALF = 48;
const RECT_HALF_WIDTH = 64;
const RECT_HALF_HEIGHT = 36;
const SEAT_OFFSET = 14;
const SEAT_RADIUS = 5;

export function tableBodyForShape(shape: SeatingTableShape): TableBody {
  switch (shape) {
    case "round":
      return { halfWidth: ROUND_RADIUS, halfHeight: ROUND_RADIUS };
    case "square":
      return { halfWidth: SQUARE_HALF, halfHeight: SQUARE_HALF };
    case "rectangle":
      return { halfWidth: RECT_HALF_WIDTH, halfHeight: RECT_HALF_HEIGHT };
  }
}

function roundSeatPositions(count: number, radius: number) {
  const positions: { x: number; y: number }[] = [];
  const orbit = radius + SEAT_OFFSET;

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    positions.push({
      x: orbit * Math.cos(angle),
      y: orbit * Math.sin(angle),
    });
  }

  return positions;
}

function perimeterSeatPositions(count: number, halfWidth: number, halfHeight: number) {
  const positions: { x: number; y: number }[] = [];
  const top = -halfHeight - SEAT_OFFSET;
  const bottom = halfHeight + SEAT_OFFSET;
  const left = -halfWidth - SEAT_OFFSET;
  const right = halfWidth + SEAT_OFFSET;
  const perimeter =
    2 * (right - left) + 2 * (bottom - top);

  for (let index = 0; index < count; index += 1) {
    const distance = (perimeter * index) / count;
    const widthSpan = right - left;
    const heightSpan = bottom - top;

    if (distance <= widthSpan) {
      positions.push({ x: left + distance, y: top });
      continue;
    }

    if (distance <= widthSpan + heightSpan) {
      positions.push({
        x: right,
        y: top + (distance - widthSpan),
      });
      continue;
    }

    if (distance <= widthSpan * 2 + heightSpan) {
      positions.push({
        x: right - (distance - widthSpan - heightSpan),
        y: bottom,
      });
      continue;
    }

    positions.push({
      x: left,
      y: bottom - (distance - widthSpan * 2 - heightSpan),
    });
  }

  return positions;
}

export function seatPositionsForTable(shape: SeatingTableShape, seatCount: number) {
  const body = tableBodyForShape(shape);

  if (shape === "round") {
    return roundSeatPositions(seatCount, body.halfWidth);
  }

  return perimeterSeatPositions(seatCount, body.halfWidth, body.halfHeight);
}

export { SEAT_RADIUS };
