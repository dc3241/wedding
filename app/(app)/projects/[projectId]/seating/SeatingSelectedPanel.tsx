"use client";

import {
  SEAT_COUNT_MAX,
  SEAT_COUNT_MIN,
  SEATING_TABLE_KINDS,
  seatingKindLabel,
  type SeatingSeatableKind,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SeatingSelectedPanelProps = {
  selectedId: string | null;
  seatCount: number | null;
  occupancy: number;
  kind: SeatingSeatableKind | null;
  isDancefloor: boolean;
  placing: boolean;
  isPending: boolean;
  onKindChange: (kind: SeatingSeatableKind) => void;
  onSeatCountChange: (seatCount: number) => void;
  onRotate: (direction: "cw" | "ccw") => void;
  onDelete: () => void;
};

export function SeatingSelectedPanel({
  selectedId,
  seatCount,
  occupancy,
  kind,
  isDancefloor,
  placing,
  isPending,
  onKindChange,
  onSeatCountChange,
  onRotate,
  onDelete,
}: SeatingSelectedPanelProps) {
  const selectionControlsDisabled = !selectedId || placing || isPending;
  const currentSeatCount = seatCount ?? SEAT_COUNT_MIN;

  return (
    <div className="flex flex-wrap items-end gap-5">
      {!isDancefloor ? (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Kind
          </p>
          <div
            className="flex flex-wrap rounded-[var(--radius-inner)] bg-well p-1 shadow-recessed"
            role="group"
            aria-label="Table kind"
          >
            {SEATING_TABLE_KINDS.map((option) => {
              const active = kind === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={selectionControlsDisabled}
                  aria-pressed={active}
                  onClick={() => onKindChange(option)}
                  className={cn(
                    "rounded-[var(--radius-inner)] px-3 py-2 text-[12px] font-semibold transition-colors",
                    active
                      ? "bg-accent-wash text-accent"
                      : "text-muted hover:text-ink",
                    selectionControlsDisabled && "opacity-60",
                  )}
                >
                  {option === "sweetheart"
                    ? "Sweetheart table"
                    : seatingKindLabel(option)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isDancefloor ? (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Seats
            <span className="ml-1.5 font-medium normal-case tracking-normal tabular-nums">
              · {occupancy} seated
            </span>
          </p>
          <div
            className="flex rounded-[var(--radius-inner)] bg-well p-1 shadow-recessed"
            role="group"
            aria-label="Seat count"
          >
            <button
              type="button"
              disabled={
                selectionControlsDisabled || currentSeatCount <= SEAT_COUNT_MIN
              }
              onClick={() => onSeatCountChange(currentSeatCount - 1)}
              className={cn(
                "rounded-[var(--radius-inner)] px-2.5 py-2 text-[12px] font-semibold text-muted transition-colors hover:text-ink",
                selectionControlsDisabled && "opacity-60",
              )}
              aria-label="Decrease seat count"
            >
              −
            </button>
            <span
              className={cn(
                "min-w-8 px-1 py-2 text-center text-[13px] font-semibold tabular-nums text-ink",
                selectionControlsDisabled && "opacity-60",
              )}
            >
              {currentSeatCount}
            </span>
            <button
              type="button"
              disabled={
                selectionControlsDisabled || currentSeatCount >= SEAT_COUNT_MAX
              }
              onClick={() => onSeatCountChange(currentSeatCount + 1)}
              className={cn(
                "rounded-[var(--radius-inner)] px-2.5 py-2 text-[12px] font-semibold text-muted transition-colors hover:text-ink",
                selectionControlsDisabled && "opacity-60",
              )}
              aria-label="Increase seat count"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Rotate
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={selectionControlsDisabled}
            onClick={() => onRotate("ccw")}
            className={cn(
              "rounded-[var(--radius-inner)] px-2.5 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-well hover:text-ink",
              selectionControlsDisabled && "opacity-60",
            )}
          >
            ⟲ −45°
          </button>
          <button
            type="button"
            disabled={selectionControlsDisabled}
            onClick={() => onRotate("cw")}
            className={cn(
              "rounded-[var(--radius-inner)] px-2.5 py-2 text-[12px] font-semibold text-muted transition-colors hover:bg-well hover:text-ink",
              selectionControlsDisabled && "opacity-60",
            )}
          >
            ⟳ +45°
          </button>
        </div>
      </div>

      <Button
        type="button"
        variant="default"
        disabled={selectionControlsDisabled}
        onClick={onDelete}
      >
        Delete
      </Button>
    </div>
  );
}
