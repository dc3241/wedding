"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { seatPositionsForTable, tableBodyForElement, SEAT_RADIUS } from "./seat-layout";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  formatPersonName,
  isDancefloor,
  type RosterPerson,
  type SeatingAssignment,
  type SeatingTable,
  type SeatingTableShape,
} from "./types";
import { cn } from "@/lib/cn";

type SeatOccupant = {
  assignment: SeatingAssignment;
  person: RosterPerson;
};

type SeatingCanvasProps = {
  tables: SeatingTable[];
  armedShape: SeatingTableShape | null;
  armedDancefloor: boolean;
  selectedId: string | null;
  occupancyByTable: Record<string, number>;
  assignmentsByTable: Record<string, SeatingAssignment[]>;
  peopleById: Map<string, RosterPerson>;
  pendingSeat: { tableId: string; seatIndex: number } | null;
  moveMode: boolean;
  assignMode: boolean;
  onPlace: (posX: number, posY: number) => void;
  onTableClick: (id: string) => void;
  onEmptyCanvasClick: (posX: number, posY: number) => void;
  onTableMove: (id: string, posX: number, posY: number) => void;
  onEmptySeatClick: (tableId: string, seatIndex: number) => void;
  onOccupiedSeatClick: (occupant: SeatOccupant) => void;
  onNeedsSeatClick: (occupant: SeatOccupant) => void;
};

type ViewportState = {
  scale: number;
  x: number;
  y: number;
};

type TableDragSession = {
  pointerId: number;
  id: string;
  originPosX: number;
  originPosY: number;
  startLogicalX: number;
  startLogicalY: number;
  startClientX: number;
  startClientY: number;
};

type DragVisual = {
  id: string;
  posX: number;
  posY: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD_PX = 4;

function rsvpLabel(status: RosterPerson["rsvp_status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function seatTooltip(person: RosterPerson) {
  const household =
    person.household_label?.trim() || person.household_name?.trim() || "—";
  const relationship = person.relationship?.trim() || "—";
  return `${formatPersonName(person)} · ${relationship} · ${household} · ${rsvpLabel(person.rsvp_status)}`;
}

function SeatingTableGraphic({
  table,
  selected,
  interactive,
  occupied,
  assignments,
  peopleById,
  pendingSeatIndex,
  livePosX,
  livePosY,
  onPointerDown,
  onEmptySeatClick,
  onOccupiedSeatClick,
  onNeedsSeatClick,
}: {
  table: SeatingTable;
  selected: boolean;
  interactive: boolean;
  occupied: number;
  assignments: SeatingAssignment[];
  peopleById: Map<string, RosterPerson>;
  pendingSeatIndex: number | null;
  livePosX: number;
  livePosY: number;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
  onEmptySeatClick: (seatIndex: number) => void;
  onOccupiedSeatClick: (occupant: SeatOccupant) => void;
  onNeedsSeatClick: (occupant: SeatOccupant) => void;
}) {
  const dancefloor = isDancefloor(table.kind);
  const sweetheart = table.kind === "sweetheart";
  const body = tableBodyForElement(table.shape, table.kind);
  const seats = seatPositionsForTable(table.shape, table.seat_count, table.kind);
  const stroke = selected || sweetheart ? "var(--accent)" : "var(--ring)";
  const strokeWidth = selected || sweetheart ? 2 : 1.5;
  const over = !dancefloor && occupied > table.seat_count;
  const full = !dancefloor && occupied >= table.seat_count;
  const countColor = over
    ? "var(--rosewood)"
    : full
      ? "var(--sage)"
      : "var(--muted)";

  const bySeat = new Map<number, SeatOccupant>();
  const needsSeat: SeatOccupant[] = [];
  for (const assignment of assignments) {
    const person = peopleById.get(assignment.guest_member_id);
    if (!person) continue;
    const occupant = { assignment, person };
    if (assignment.seat_index == null) {
      needsSeat.push(occupant);
    } else {
      bySeat.set(assignment.seat_index, occupant);
    }
  }

  return (
    <g
      transform={`translate(${livePosX} ${livePosY})`}
      aria-label={
        dancefloor
          ? table.label
          : over
            ? `${table.label}${sweetheart ? ", sweetheart" : ""}, ${occupied} of ${table.seat_count} seats — over capacity`
            : `${table.label}${sweetheart ? ", sweetheart" : ""}, ${occupied} of ${table.seat_count} seats filled`
      }
    >
      <g
        transform={`rotate(${table.rotation})`}
        style={{
          pointerEvents: interactive ? "auto" : "none",
          cursor: interactive ? "grab" : undefined,
        }}
        onPointerDown={onPointerDown}
        onClick={(event) => {
          // Selection is handled on pointerup (capture retargets click to <svg>).
          event.stopPropagation();
        }}
      >
        {dancefloor ? (
          <rect
            x={-body.halfWidth}
            y={-body.halfHeight}
            width={body.halfWidth * 2}
            height={body.halfHeight * 2}
            rx={8}
            fill="var(--well)"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray="7 5"
          />
        ) : table.shape === "round" ? (
          <circle
            cx={0}
            cy={0}
            r={body.halfWidth}
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ) : (
          <rect
            x={-body.halfWidth}
            y={-body.halfHeight}
            width={body.halfWidth * 2}
            height={body.halfHeight * 2}
            rx={table.shape === "square" ? 4 : 6}
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}

        {seats.map((seat, zeroIndex) => {
          const seatIndex = zeroIndex + 1;
          const occupant = bySeat.get(seatIndex) ?? null;
          const filled = occupant != null;
          const pending = pendingSeatIndex === seatIndex;
          const declined = occupant?.person.rsvp_status === "declined";

          return (
            <g
              key={`${table.id}-seat-${seatIndex}`}
              transform={`translate(${seat.x} ${seat.y})`}
              style={{
                pointerEvents: interactive ? "auto" : "none",
                cursor: interactive ? "pointer" : undefined,
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                if (occupant) {
                  onOccupiedSeatClick(occupant);
                } else {
                  onEmptySeatClick(seatIndex);
                }
              }}
            >
              {occupant ? <title>{seatTooltip(occupant.person)}</title> : null}
              <circle
                cx={0}
                cy={0}
                r={SEAT_RADIUS}
                fill={
                  declined
                    ? "var(--rosewood)"
                    : filled
                      ? "var(--sage)"
                      : pending
                        ? "var(--accent-wash)"
                        : "var(--surface)"
                }
                stroke={
                  declined
                    ? "var(--rosewood)"
                    : filled
                      ? "var(--sage)"
                      : pending
                        ? "var(--accent)"
                        : "var(--ring)"
                }
                strokeWidth={pending || filled ? 2 : 1.75}
              />
              <text
                x={0}
                y={0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={filled ? "var(--surface)" : "var(--ink)"}
                fontSize={9}
                fontFamily="var(--font-sans)"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {seatIndex}
              </text>
            </g>
          );
        })}
      </g>

      <text
        x={0}
        y={dancefloor ? 0 : -4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--ink)"
        fontSize={dancefloor ? 16 : 15}
        fontFamily="var(--font-sans)"
        fontWeight={500}
        style={{ pointerEvents: "none" }}
      >
        {table.label}
      </text>

      {sweetheart ? (
        <text
          x={0}
          y={-20}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--accent)"
          fontSize={10}
          fontFamily="var(--font-sans)"
          fontWeight={600}
          letterSpacing="0.06em"
          style={{ pointerEvents: "none", textTransform: "uppercase" }}
        >
          Sweetheart
        </text>
      ) : null}

      {!dancefloor ? (
        <text
          x={0}
          y={14}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={countColor}
          fontSize={13}
          fontFamily="var(--font-sans)"
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {over
            ? `${occupied}/${table.seat_count} — over capacity`
            : `${occupied}/${table.seat_count}`}
        </text>
      ) : null}

      {!dancefloor && needsSeat.length > 0 ? (
        <g transform={`translate(0 ${body.halfHeight + 28})`}>
          {needsSeat.map((occupant, index) => (
            <g
              key={occupant.assignment.id}
              transform={`translate(0 ${index * 16})`}
              style={{
                pointerEvents: interactive ? "auto" : "none",
                cursor: interactive ? "pointer" : undefined,
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                onNeedsSeatClick(occupant);
              }}
            >
              <title>{seatTooltip(occupant.person)}</title>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--rosewood)"
                fontSize={11}
                fontFamily="var(--font-sans)"
                fontWeight={500}
              >
                {formatPersonName(occupant.person)} — needs a seat
                {occupant.person.rsvp_status === "declined"
                  ? " · declined"
                  : ""}
              </text>
            </g>
          ))}
        </g>
      ) : null}
    </g>
  );
}

function clientToLogical(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return { x: 0, y: 0 };
  }

  const logical = point.matrixTransform(matrix.inverse());
  return { x: logical.x, y: logical.y };
}

export function SeatingCanvas({
  tables,
  armedShape,
  armedDancefloor,
  selectedId,
  occupancyByTable,
  assignmentsByTable,
  peopleById,
  pendingSeat,
  moveMode,
  assignMode,
  onPlace,
  onTableClick,
  onEmptyCanvasClick,
  onTableMove,
  onEmptySeatClick,
  onOccupiedSeatClick,
  onNeedsSeatClick,
}: SeatingCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [allowViewportInteraction, setAllowViewportInteraction] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const panStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchStart = useRef<{
    distance: number;
    scale: number;
    origin: { x: number; y: number };
  } | null>(null);
  const tableDrag = useRef<TableDragSession | null>(null);
  const didDragRef = useRef(false);
  // setPointerCapture on <svg> retargets the synthesized click there — swallow it
  // so empty-canvas move doesn't steal table select/drag gestures.
  const suppressCanvasClickRef = useRef(false);

  const placing = armedShape !== null || armedDancefloor;
  const viewportGesturesEnabled = allowViewportInteraction && !placing;

  const renderOrder = [...tables].sort((a, b) => {
    const aFloor = isDancefloor(a.kind) ? 0 : 1;
    const bFloor = isDancefloor(b.kind) ? 0 : 1;
    return aFloor - bFloor;
  });

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setAllowViewportInteraction(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const clampScale = useCallback((scale: number) => {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }, []);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (suppressCanvasClickRef.current) {
        suppressCanvasClickRef.current = false;
        return;
      }

      const svg = svgRef.current;
      if (!svg) return;

      const { x, y } = clientToLogical(svg, event.clientX, event.clientY);

      if (placing) {
        onPlace(x, y);
        return;
      }

      onEmptyCanvasClick(x, y);
    },
    [onEmptyCanvasClick, onPlace, placing],
  );

  const handleTablePointerDown = useCallback(
    (table: SeatingTable, event: React.PointerEvent<SVGGElement>) => {
      if (placing) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const svg = svgRef.current;
      if (!svg) return;

      event.stopPropagation();

      const { x, y } = clientToLogical(svg, event.clientX, event.clientY);
      tableDrag.current = {
        pointerId: event.pointerId,
        id: table.id,
        originPosX: table.pos_x,
        originPosY: table.pos_y,
        startLogicalX: x,
        startLogicalY: y,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      didDragRef.current = false;
      setDragVisual({ id: table.id, posX: table.pos_x, posY: table.pos_y });
      svg.setPointerCapture(event.pointerId);
    },
    [placing],
  );

  const handleTableDragMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = tableDrag.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const svg = svgRef.current;
      if (!svg) return;

      const { x, y } = clientToLogical(svg, event.clientX, event.clientY);
      const dx = x - drag.startLogicalX;
      const dy = y - drag.startLogicalY;

      if (
        Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY,
        ) >= DRAG_THRESHOLD_PX
      ) {
        didDragRef.current = true;
      }

      setDragVisual({
        id: drag.id,
        posX: drag.originPosX + dx,
        posY: drag.originPosY + dy,
      });
    },
    [],
  );

  const handleTableDragEnd = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const drag = tableDrag.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const svg = svgRef.current;
      if (svg?.hasPointerCapture(event.pointerId)) {
        svg.releasePointerCapture(event.pointerId);
      }

      tableDrag.current = null;

      if (didDragRef.current && svg) {
        const { x, y } = clientToLogical(svg, event.clientX, event.clientY);
        onTableMove(
          drag.id,
          drag.originPosX + (x - drag.startLogicalX),
          drag.originPosY + (y - drag.startLogicalY),
        );
      } else if (event.type !== "pointercancel") {
        // Click path: capture stole the <g> click — select here instead.
        onTableClick(drag.id);
      }

      // Swallow the capture-retargeted SVG click that follows pointerup only.
      if (event.type !== "pointercancel") {
        suppressCanvasClickRef.current = true;
      }

      didDragRef.current = false;
      setDragVisual(null);
    },
    [onTableClick, onTableMove],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!viewportGesturesEnabled) return;
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      setViewport((current) => ({
        ...current,
        scale: clampScale(current.scale + delta),
      }));
    },
    [clampScale, viewportGesturesEnabled],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportGesturesEnabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      panStart.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [viewport.x, viewport.y, viewportGesturesEnabled],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current || panStart.current.pointerId !== event.pointerId) return;

    setViewport((current) => ({
      ...current,
      x: panStart.current!.originX + (event.clientX - panStart.current!.x),
      y: panStart.current!.originY + (event.clientY - panStart.current!.y),
    }));
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panStart.current?.pointerId === event.pointerId) {
      panStart.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!viewportGesturesEnabled) return;
      if (event.touches.length !== 2) return;

      const [first, second] = Array.from(event.touches);
      const distance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY,
      );

      pinchStart.current = {
        distance,
        scale: viewport.scale,
        origin: { x: viewport.x, y: viewport.y },
      };
    },
    [viewport.scale, viewport.x, viewport.y, viewportGesturesEnabled],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!viewportGesturesEnabled) return;
      if (event.touches.length !== 2 || !pinchStart.current) return;
      event.preventDefault();

      const [first, second] = Array.from(event.touches);
      const distance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY,
      );
      const nextScale = clampScale(
        pinchStart.current.scale * (distance / pinchStart.current.distance),
      );

      setViewport({
        scale: nextScale,
        x: pinchStart.current.origin.x,
        y: pinchStart.current.origin.y,
      });
    },
    [clampScale, viewportGesturesEnabled],
  );

  const onTouchEnd = useCallback(() => {
    pinchStart.current = null;
  }, []);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-canvas shadow-raised",
        placing || assignMode || moveMode || pendingSeat || selectedId
          ? "cursor-crosshair"
          : "cursor-default",
        viewportGesturesEnabled && "touch-pan-x touch-pan-y",
      )}
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="h-full w-full"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "center center",
        }}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleCanvasClick}
        onPointerMove={handleTableDragMove}
        onPointerUp={handleTableDragEnd}
        onPointerCancel={handleTableDragEnd}
        role="img"
        aria-label="Seating floor plan"
      >
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="var(--canvas)"
        />
        <rect
          x={0.75}
          y={0.75}
          width={CANVAS_WIDTH - 1.5}
          height={CANVAS_HEIGHT - 1.5}
          fill="none"
          stroke="var(--ring)"
          strokeWidth={1.5}
        />

        {tables.length === 0 ? (
          <text
            x={CANVAS_WIDTH / 2}
            y={CANVAS_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted)"
            fontSize={15}
            fontFamily="var(--font-sans)"
          >
            No tables yet — arm a shape or dance floor and click to place.
          </text>
        ) : null}

        {renderOrder.map((table) => {
          const live =
            dragVisual?.id === table.id
              ? dragVisual
              : { posX: table.pos_x, posY: table.pos_y };

          return (
            <SeatingTableGraphic
              key={table.id}
              table={table}
              selected={selectedId === table.id}
              interactive={!placing}
              occupied={occupancyByTable[table.id] ?? 0}
              assignments={assignmentsByTable[table.id] ?? []}
              peopleById={peopleById}
              pendingSeatIndex={
                pendingSeat?.tableId === table.id ? pendingSeat.seatIndex : null
              }
              livePosX={live.posX}
              livePosY={live.posY}
              onPointerDown={(event) => handleTablePointerDown(table, event)}
              onEmptySeatClick={(seatIndex) =>
                onEmptySeatClick(table.id, seatIndex)
              }
              onOccupiedSeatClick={onOccupiedSeatClick}
              onNeedsSeatClick={onNeedsSeatClick}
            />
          );
        })}
      </svg>
    </div>
  );
}
