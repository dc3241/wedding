"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { seatPositionsForTable, tableBodyForShape, SEAT_RADIUS } from "./seat-layout";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type SeatingTable,
  type SeatingTableKind,
  type SeatingTableShape,
} from "./types";
import { cn } from "@/lib/cn";

type SeatingCanvasProps = {
  tables: SeatingTable[];
  armedShape: SeatingTableShape | null;
  selectedId: string | null;
  onPlace: (posX: number, posY: number) => void;
  onSelectTable: (id: string) => void;
  onEmptyCanvasClick: (posX: number, posY: number) => void;
};

type ViewportState = {
  scale: number;
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 2.5;

function kindStroke(kind: SeatingTableKind, selected: boolean) {
  if (selected) {
    return { stroke: "var(--plum)", strokeWidth: 2 };
  }

  switch (kind) {
    case "sweetheart":
      return { stroke: "var(--rosewood)", strokeWidth: 2 };
    case "head":
      return { stroke: "var(--clay)", strokeWidth: 2 };
    default:
      return { stroke: "var(--stone)", strokeWidth: 1.5 };
  }
}

function SeatingTableGraphic({
  table,
  selected,
  interactive,
  onSelect,
}: {
  table: SeatingTable;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
}) {
  const body = tableBodyForShape(table.shape);
  const seats = seatPositionsForTable(table.shape, table.seat_count);
  const outline = kindStroke(table.kind, selected);

  return (
    <g
      transform={`translate(${table.pos_x} ${table.pos_y}) rotate(${table.rotation})`}
      aria-label={`${table.label}, ${table.seat_count} seats`}
      style={{ pointerEvents: interactive ? "auto" : "none" }}
      onClick={(event) => {
        if (!interactive) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      {table.shape === "round" ? (
        <circle
          cx={0}
          cy={0}
          r={body.halfWidth}
          fill="var(--surface)"
          stroke={outline.stroke}
          strokeWidth={outline.strokeWidth}
        />
      ) : (
        <rect
          x={-body.halfWidth}
          y={-body.halfHeight}
          width={body.halfWidth * 2}
          height={body.halfHeight * 2}
          rx={table.shape === "square" ? 4 : 6}
          fill="var(--surface)"
          stroke={outline.stroke}
          strokeWidth={outline.strokeWidth}
        />
      )}

      <text
        x={0}
        y={0}
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

      {seats.map((seat, index) => (
        <circle
          key={`${table.id}-seat-${index}`}
          cx={seat.x}
          cy={seat.y}
          r={SEAT_RADIUS}
          fill="var(--surface-2)"
          stroke="var(--stone)"
          strokeWidth={1}
          style={{ pointerEvents: "none" }}
        />
      ))}
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
  onPlace,
  onSelectTable,
  onEmptyCanvasClick,
}: SeatingCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [allowViewportInteraction, setAllowViewportInteraction] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    x: 0,
    y: 0,
  });
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
        "relative overflow-hidden rounded-lg border border-stone bg-surface-2",
        placing ? "cursor-crosshair" : selectedId ? "cursor-crosshair" : "cursor-default",
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
        role="img"
        aria-label="Seating floor plan"
      >
        <rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="var(--surface-2)"
        />
        <rect
          x={0.75}
          y={0.75}
          width={CANVAS_WIDTH - 1.5}
          height={CANVAS_HEIGHT - 1.5}
          fill="none"
          stroke="var(--stone)"
          strokeWidth={1.5}
        />

        {tables.length === 0 ? (
          <text
            x={CANVAS_WIDTH / 2}
            y={CANVAS_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--ink-muted)"
            fontSize={15}
            fontFamily="var(--font-sans)"
          >
            No tables yet — arm a shape and click to place one.
          </text>
        ) : null}

        {tables.map((table) => (
          <SeatingTableGraphic
            key={table.id}
            table={table}
            selected={selectedId === table.id}
            interactive={!placing}
            onSelect={() => onSelectTable(table.id)}
          />
        ))}
      </svg>
    </div>
  );
}
