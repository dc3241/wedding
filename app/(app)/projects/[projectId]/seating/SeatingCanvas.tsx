"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { seatPositionsForTable, tableBodyForShape, SEAT_RADIUS } from "./seat-layout";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  seatingTableKindLabel,
  type SeatingTable,
  type SeatingTableShape,
} from "./types";
import { cn } from "@/lib/cn";

type SeatingCanvasProps = {
  tables: SeatingTable[];
  armedShape: SeatingTableShape | null;
  selectedId: string | null;
  occupancyByTable: Record<string, number>;
  assignMode: boolean;
  onPlace: (posX: number, posY: number) => void;
  onTableClick: (id: string) => void;
  onEmptyCanvasClick: (posX: number, posY: number) => void;
  onTableMove: (id: string, posX: number, posY: number) => void;
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

const INSET_RING_OFFSET = 5;
const DRAG_THRESHOLD_PX = 4;

function SeatingTableGraphic({
  table,
  selected,
  interactive,
  occupied,
  livePosX,
  livePosY,
  onPointerDown,
}: {
  table: SeatingTable;
  selected: boolean;
  interactive: boolean;
  occupied: number;
  livePosX: number;
  livePosY: number;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const body = tableBodyForShape(table.shape);
  const seats = seatPositionsForTable(table.shape, table.seat_count, table.kind);
  const stroke = selected ? "var(--accent)" : "var(--ring)";
  const strokeWidth = selected ? 2 : 1.5;
  const distinguished = table.kind !== "standard";
  const full = occupied >= table.seat_count;
  const countColor = full ? "var(--sage)" : "var(--muted)";

  return (
    <g
      transform={`translate(${livePosX} ${livePosY})`}
      aria-label={`${table.label}, ${occupied} of ${table.seat_count} seats filled`}
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
      <g transform={`rotate(${table.rotation})`}>
        {table.shape === "round" ? (
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

        {distinguished ? (
          table.shape === "round" ? (
            <circle
              cx={0}
              cy={0}
              r={body.halfWidth - INSET_RING_OFFSET}
              fill="none"
              stroke="var(--ring)"
              strokeWidth={1}
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <rect
              x={-body.halfWidth + INSET_RING_OFFSET}
              y={-body.halfHeight + INSET_RING_OFFSET}
              width={body.halfWidth * 2 - INSET_RING_OFFSET * 2}
              height={body.halfHeight * 2 - INSET_RING_OFFSET * 2}
              rx={table.shape === "square" ? 2 : 4}
              fill="none"
              stroke="var(--ring)"
              strokeWidth={1}
              style={{ pointerEvents: "none" }}
            />
          )
        ) : null}

        {seats.map((seat, index) => (
          <circle
            key={`${table.id}-seat-${index}`}
            cx={seat.x}
            cy={seat.y}
            r={SEAT_RADIUS}
            fill={index < occupied ? "var(--sage)" : "var(--well)"}
            stroke={index < occupied ? "var(--sage)" : "var(--ring)"}
            strokeWidth={1}
            style={{ pointerEvents: "none" }}
          />
        ))}
      </g>

      {distinguished ? (
        <text
          x={0}
          y={-18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--muted)"
          fontSize={10}
          fontFamily="var(--font-sans)"
          fontWeight={400}
          style={{ pointerEvents: "none" }}
        >
          {seatingTableKindLabel(table.kind)}
        </text>
      ) : null}

      <text
        x={0}
        y={-4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--ink)"
        fontSize={13}
        fontFamily="var(--font-sans)"
        fontWeight={500}
        style={{ pointerEvents: "none" }}
      >
        {table.label}
      </text>

      <text
        x={0}
        y={12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={countColor}
        fontSize={11}
        fontFamily="var(--font-sans)"
        fontWeight={500}
        style={{ pointerEvents: "none" }}
      >
        {occupied}/{table.seat_count}
      </text>
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
  selectedId,
  occupancyByTable,
  assignMode,
  onPlace,
  onTableClick,
  onEmptyCanvasClick,
  onTableMove,
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

  const placing = armedShape !== null;
  const viewportGesturesEnabled = allowViewportInteraction && !placing;

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
        placing || assignMode || selectedId ? "cursor-crosshair" : "cursor-default",
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
            No tables yet — arm a shape and click to place one.
          </text>
        ) : null}

        {tables.map((table) => {
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
              livePosX={live.posX}
              livePosY={live.posY}
              onPointerDown={(event) => handleTablePointerDown(table, event)}
            />
          );
        })}
      </svg>
    </div>
  );
}
