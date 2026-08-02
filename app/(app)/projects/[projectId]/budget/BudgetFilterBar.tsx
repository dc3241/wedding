"use client";

import { toLocalDateKey } from "@/app/(app)/calendar/calendar-source";
import type { BudgetItemForAggregate } from "@/lib/budget-aggregates";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type BudgetStatusFilter =
  | "all"
  | "unpaid"
  | "paid_in_full"
  | "past_due";

const STATUS_OPTIONS: { id: BudgetStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "paid_in_full", label: "Paid in full" },
  { id: "past_due", label: "Past due" },
];

/**
 * Status predicates for BUD-FILTER-01.
 * balance = actual − paid, only when actual_amount !== null.
 * Unpriced items (actual null) match no status bucket — All only.
 */
export function itemMatchesStatus(
  item: BudgetItemForAggregate,
  status: BudgetStatusFilter,
  todayKey: string,
): boolean {
  if (status === "all") return true;
  if (item.actual_amount === null) return false;

  const balance = Number(item.actual_amount) - Number(item.paid);

  if (status === "unpaid") return balance > 0;
  if (status === "paid_in_full") return balance <= 0;
  // Past due: next uncovered installment due strictly before today (local key).
  return item.nextDue != null && item.nextDue.due_on < todayKey;
}

export function statusMatchLabel(
  status: BudgetStatusFilter,
  count: number,
): string | null {
  if (status === "all" || count === 0) return null;
  if (status === "unpaid") {
    return count === 1 ? "1 unpaid" : `${count} unpaid`;
  }
  if (status === "paid_in_full") {
    return count === 1 ? "1 paid in full" : `${count} paid in full`;
  }
  return count === 1 ? "1 past due" : `${count} past due`;
}

export function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

export function BudgetFilterBar({
  status,
  onStatusChange,
  category,
  onCategoryChange,
  categories,
}: {
  status: BudgetStatusFilter;
  onStatusChange: (next: BudgetStatusFilter) => void;
  category: string;
  onCategoryChange: (next: string) => void;
  /** Category keys currently present on the board (from items). */
  categories: string[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div
        role="tablist"
        aria-label="Filter by payment status"
        className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
      >
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(option.id)}
              className={cn(
                "cursor-pointer rounded-[var(--radius-pill)] border-none px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-accent-wash text-accent"
                  : "bg-transparent text-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:w-auto sm:max-w-xs">
        <label
          htmlFor="budget-filter-category"
          className="shrink-0 text-[13px] font-medium text-muted"
        >
          Category
        </label>
        <Select
          id="budget-filter-category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="min-w-0 py-1.5 text-[13px]"
        >
          <option value="">All</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
