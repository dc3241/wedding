"use client";

import type { ReactNode } from "react";
import {
  SEAT_COUNT_MAX,
  SEAT_COUNT_MIN,
  SEATING_TABLE_SHAPES,
  seatingShapeLabel,
  type SeatingTableShape,
} from "./types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type SeatingToolbarProps = {
  armedShape: SeatingTableShape | null;
  seatCount: number;
  isPending: boolean;
  onToggleShape: (shape: SeatingTableShape) => void;
  onSeatCountChange: (seatCount: number) => void;
  children?: ReactNode;
};

function ShapeIcon({ shape }: { shape: SeatingTableShape }) {
  const className = "stroke-ring fill-surface";

  if (shape === "round") {
    return (
      <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
        <circle cx={16} cy={16} r={11} className={className} strokeWidth={1.5} />
      </svg>
    );
  }

  if (shape === "square") {
    return (
      <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
        <rect
          x={7}
          y={7}
          width={18}
          height={18}
          rx={2}
          className={className}
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
      <rect
        x={4}
        y={10}
        width={24}
        height={12}
        rx={2}
        className={className}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function SeatingToolbar({
  armedShape,
  seatCount,
  isPending,
  onToggleShape,
  onSeatCountChange,
  children,
}: SeatingToolbarProps) {
  return (
    <Card className="w-full px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Add table
            </p>
            <div
              className="flex rounded-[var(--radius-inner)] bg-well p-1 shadow-recessed"
              role="group"
              aria-label="Table shape"
            >
              {SEATING_TABLE_SHAPES.map((shape) => {
                const armed = armedShape === shape;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => onToggleShape(shape)}
                    disabled={isPending}
                    aria-pressed={armed}
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--radius-inner)] px-3 py-2 text-[13px] font-semibold transition-colors",
                      armed
                        ? "bg-accent-wash text-accent"
                        : "text-muted hover:text-ink",
                      isPending && "opacity-60",
                    )}
                  >
                    <ShapeIcon shape={shape} />
                    {seatingShapeLabel(shape)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-24">
            <label
              htmlFor="seat-count"
              className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
            >
              Seats
            </label>
            <Input
              id="seat-count"
              type="number"
              min={SEAT_COUNT_MIN}
              max={SEAT_COUNT_MAX}
              value={seatCount}
              disabled={!armedShape || isPending}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(next)) return;
                onSeatCountChange(next);
              }}
            />
          </div>
        </div>

        {children ? (
          <div className="flex items-end gap-6">
            <div
              className="hidden h-10 w-px shrink-0 self-end bg-hairline sm:block"
              aria-hidden
            />
            {children}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
