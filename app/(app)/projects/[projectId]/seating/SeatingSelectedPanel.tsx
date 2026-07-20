"use client";

import {
  SEATING_TABLE_KINDS,
  seatingTableKindLabel,
  type SeatingTableKind,
  type SeatingTableShape,
} from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SeatingSelectedPanelProps = {
  selectedId: string | null;
  selectedKind: SeatingTableKind | null;
  armedShape: SeatingTableShape | null;
  isPending: boolean;
  onKindChange: (kind: SeatingTableKind) => void;
  onRotate: (direction: "cw" | "ccw") => void;
  onDelete: () => void;
};

export function SeatingSelectedPanel({
  selectedId,
  selectedKind,
  armedShape,
  isPending,
  onKindChange,
  onRotate,
  onDelete,
}: SeatingSelectedPanelProps) {
  const selectionControlsDisabled =
    !selectedId || Boolean(armedShape) || isPending;

  return (
    <div className="flex flex-wrap items-end gap-5">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Kind
        </p>
        <div
          className="flex rounded-[var(--radius-inner)] bg-well p-1 shadow-recessed"
          role="group"
          aria-label="Table kind"
        >
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
                  "rounded-[var(--radius-inner)] px-2.5 py-2 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-accent-wash text-accent"
                    : "text-muted hover:text-ink",
                  selectionControlsDisabled && "opacity-60",
                )}
              >
                {seatingTableKindLabel(kind)}
              </button>
            );
          })}
        </div>
      </div>

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
            ⟲ −15°
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
            ⟳ +15°
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
