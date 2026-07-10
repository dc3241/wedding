"use client";

import {
  DEFAULT_SEAT_COUNT_BY_SHAPE,
  SEAT_COUNT_MAX,
  SEAT_COUNT_MIN,
  SEATING_TABLE_KINDS,
  SEATING_TABLE_SHAPES,
  seatingShapeLabel,
  seatingTableKindLabel,
  type SeatingTableKind,
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
  selectedKind: SeatingTableKind | null;
  isPending: boolean;
  onToggleShape: (shape: SeatingTableShape) => void;
  onSeatCountChange: (seatCount: number) => void;
  onKindChange: (kind: SeatingTableKind) => void;
  onRotate: (direction: "cw" | "ccw") => void;
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
  selectedKind,
  isPending,
  onToggleShape,
  onSeatCountChange,
  onKindChange,
  onRotate,
  onDelete,
}: SeatingPaletteProps) {
  const selectionControlsDisabled =
    !selectedId || Boolean(armedShape) || isPending;

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

        <div className="mb-4">
          <p className="mb-2 text-[12px] font-medium text-ink-muted">Kind</p>
          <div className="flex flex-wrap gap-1">
            {SEATING_TABLE_KINDS.map((kind) => {
              const active = selectedKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={selectionControlsDisabled}
                  aria-pressed={active}
                  onClick={() => onKindChange(kind)}
                  className={cn(
                    "rounded px-2 py-1 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-stone-soft text-ink underline decoration-stone decoration-1 underline-offset-4"
                      : "text-ink-muted hover:bg-stone-soft/60 hover:text-ink",
                    selectionControlsDisabled && "opacity-60",
                  )}
                >
                  {seatingTableKindLabel(kind)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[12px] font-medium text-ink-muted">Rotate</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectionControlsDisabled}
              onClick={() => onRotate("ccw")}
              className={cn(
                "flex-1 rounded border border-stone bg-surface px-2 py-2 text-[12px] font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink",
                selectionControlsDisabled && "opacity-60",
              )}
            >
              ⟲ −15°
            </button>
            <button
              type="button"
              disabled={selectionControlsDisabled}
              onClick={() => onRotate("cw")}
              className={cn(
                "flex-1 rounded border border-stone bg-surface px-2 py-2 text-[12px] font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink",
                selectionControlsDisabled && "opacity-60",
              )}
            >
              ⟳ +15°
            </button>
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="w-full"
          disabled={selectionControlsDisabled}
          onClick={onDelete}
        >
          Delete table
        </Button>
      </div>
    </aside>
  );
}
