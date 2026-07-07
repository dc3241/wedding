"use client";

import {
  DEFAULT_SEAT_COUNT_BY_SHAPE,
  SEAT_COUNT_MAX,
  SEAT_COUNT_MIN,
  SEATING_TABLE_SHAPES,
  seatingShapeLabel,
  type SeatingTableShape,
} from "./types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type SeatingPaletteProps = {
  armedShape: SeatingTableShape | null;
  seatCount: number;
  selectedId: string | null;
  isPending: boolean;
  onToggleShape: (shape: SeatingTableShape) => void;
  onSeatCountChange: (seatCount: number) => void;
  onDelete: () => void;
};

function ShapeIcon({ shape }: { shape: SeatingTableShape }) {
  const className = "stroke-stone fill-surface";

  if (shape === "round") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx={16} cy={16} r={11} className={className} strokeWidth={1.5} />
      </svg>
    );
  }

  if (shape === "square") {
    return (
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect x={7} y={7} width={18} height={18} rx={2} className={className} strokeWidth={1.5} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <rect x={4} y={10} width={24} height={12} rx={2} className={className} strokeWidth={1.5} />
    </svg>
  );
}

export function SeatingPalette({
  armedShape,
  seatCount,
  selectedId,
  isPending,
  onToggleShape,
  onSeatCountChange,
  onDelete,
}: SeatingPaletteProps) {
  return (
    <aside className="w-full shrink-0 rounded-lg border border-stone bg-surface p-4 lg:w-56">
      <Eyebrow className="mb-3 block">Add table</Eyebrow>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
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
                "flex flex-col items-center gap-2 rounded border px-3 py-3 text-[13px] font-medium transition-colors",
                armed
                  ? "border-ink bg-stone-soft text-ink"
                  : "border-stone bg-surface text-ink-muted hover:border-ink-muted hover:text-ink",
                isPending && "opacity-60",
              )}
            >
              <ShapeIcon shape={shape} />
              {seatingShapeLabel(shape)}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label htmlFor="seat-count" className="mb-2 block text-[12px] font-medium text-ink-muted">
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

      <div className="mt-5 border-t border-stone pt-4">
        <Eyebrow className="mb-3 block">Selected</Eyebrow>
        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={!selectedId || Boolean(armedShape) || isPending}
          onClick={onDelete}
        >
          Delete table
        </Button>
      </div>
    </aside>
  );
}
