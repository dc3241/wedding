"use client";

import { cn } from "@/lib/cn";

/** Accessible move-up / move-down for ordered editor lists (no @dnd-kit). */
export function ReorderButtons({
  index,
  total,
  onMove,
  disabled,
  label,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
        className={cn(
          "rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-medium text-muted",
          "hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label={`Move ${label} up`}
      >
        Up
      </button>
      <button
        type="button"
        disabled={disabled || index >= total - 1}
        onClick={() => onMove(index, index + 1)}
        className={cn(
          "rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-medium text-muted",
          "hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
        )}
        aria-label={`Move ${label} down`}
      >
        Down
      </button>
    </div>
  );
}

export function moveArrayItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
