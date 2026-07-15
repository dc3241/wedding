"use client";

import { useState } from "react";
import { AddBudgetItemForm } from "./AddBudgetItemForm";
import { BudgetItemRow } from "./BudgetItemRow";
import { TotalBudgetEditor } from "./TotalBudgetEditor";
import type {
  BudgetAggregates,
  BudgetCategoryGroup,
  ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";

type BudgetBoardProps = {
  projectId: string;
  aggregates: BudgetAggregates;
  projectVendors: ProjectVendorOption[];
};

function AllocationBand({
  projectId,
  aggregates,
}: {
  projectId: string;
  aggregates: BudgetAggregates;
}) {
  const {
    totalBudget,
    allocated,
    spent,
    committed,
    unallocated,
  } = aggregates;

  const overAllocated = unallocated !== null && unallocated < 0;
  const showBar = totalBudget !== null;

  let spentPct = 0;
  let committedPct = 0;
  if (showBar && totalBudget > 0) {
    if (overAllocated) {
      const fillBase = allocated > 0 ? allocated : totalBudget;
      spentPct = Math.min(100, (spent / fillBase) * 100);
      committedPct = Math.min(100 - spentPct, (committed / fillBase) * 100);
    } else {
      spentPct = Math.min(100, (spent / totalBudget) * 100);
      committedPct = Math.min(
        100 - spentPct,
        (committed / totalBudget) * 100,
      );
    }
  } else if (showBar && overAllocated) {
    spentPct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;
    committedPct = Math.min(100 - spentPct, 100);
  }

  return (
    <Card className="px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-[15px] font-medium text-ink">Budget</h1>
        <TotalBudgetEditor projectId={projectId} totalBudget={totalBudget} />
      </div>

      {showBar ? (
        <div
          className="mt-3 flex h-2 overflow-hidden rounded bg-stone/40"
          role="img"
          aria-label={
            overAllocated
              ? "Budget fully allocated, over target"
              : `Spent ${formatCurrency(spent)}, committed ${formatCurrency(committed)} of ${formatCurrency(totalBudget)}`
          }
        >
          {spentPct > 0 ? (
            <div
              className="h-full bg-sage transition-[width] duration-300"
              style={{ width: `${spentPct}%` }}
            />
          ) : null}
          {committedPct > 0 ? (
            <div
              className={cn(
                "h-full transition-[width] duration-300",
                overAllocated ? "bg-rosewood" : "bg-plum",
              )}
              style={{ width: `${committedPct}%` }}
            />
          ) : null}
        </div>
      ) : null}

      <dl
        className={cn(
          "mt-4 grid gap-4",
          totalBudget === null
            ? "grid-cols-3"
            : "grid-cols-2 sm:grid-cols-4",
        )}
      >
        <StatCell label="Allocated" value={formatCurrency(allocated)} />
        <StatCell label="Spent" value={formatCurrency(spent)} />
        <StatCell label="Committed" value={formatCurrency(committed)} />
        {unallocated !== null ? (
          <StatCell
            label="Unallocated"
            value={
              unallocated < 0
                ? `${formatCurrency(Math.abs(unallocated))} over`
                : formatCurrency(unallocated)
            }
            tone={unallocated < 0 ? "rosewood" : "default"}
          />
        ) : null}
      </dl>
    </Card>
  );
}

function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "rosewood";
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-[18px] tabular-nums",
          tone === "rosewood" ? "text-rosewood" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function CategoryFigure({ group }: { group: BudgetCategoryGroup }) {
  const untracked = group.actualTotal === 0;
  const over = group.isOver;

  if (untracked) {
    return (
      <span className="text-[13px] tabular-nums text-ink-muted">
        Nothing tracked of {formatCurrency(group.plannedTotal)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-[13px] tabular-nums",
        over ? "text-rosewood" : "text-ink-muted",
      )}
    >
      {formatCurrency(group.actualTotal)} of{" "}
      {formatCurrency(group.plannedTotal)}
      {over ? " · over" : null}
    </span>
  );
}

function CategoryBar({ group }: { group: BudgetCategoryGroup }) {
  const untracked = group.actualTotal === 0;
  const over = group.isOver;
  const pct =
    group.plannedTotal > 0
      ? Math.min(100, (group.actualTotal / group.plannedTotal) * 100)
      : group.actualTotal > 0
        ? 100
        : 0;

  return (
    <div className="mt-2 h-[3px] overflow-hidden rounded-[2px] bg-stone/40">
      {!untracked && pct > 0 ? (
        <div
          className={cn(
            "h-full transition-[width] duration-300",
            over ? "bg-rosewood" : "bg-sage",
          )}
          style={{ width: `${pct}%` }}
        />
      ) : null}
    </div>
  );
}

function CategorySection({
  group,
  collapsed,
  onToggle,
  projectVendors,
}: {
  group: BudgetCategoryGroup;
  collapsed: boolean;
  onToggle: () => void;
  projectVendors: ProjectVendorOption[];
}) {
  return (
    <li className="rounded border-[0.5px] border-stone bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="w-full px-3.5 py-3 text-left sm:px-4"
      >
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-1 text-ink-muted transition-transform",
              collapsed ? "-rotate-90" : "rotate-0",
            )}
            aria-hidden
          >
            <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
              <path d="M2.5 4.25L6 7.75l3.5-3.5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-x-3">
              <span className="truncate text-[15px] font-medium text-ink">
                {group.category}
              </span>
              <CategoryFigure group={group} />
            </div>
            <CategoryBar group={group} />
          </div>
        </div>
      </button>

      {!collapsed ? (
        <div className="border-t-[0.5px] border-stone px-3.5 pb-3 pt-2 sm:px-4">
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_96px_96px_52px] gap-x-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            <span>Item</span>
            <span className="text-right">Planned</span>
            <span className="text-right">Spent</span>
            <span />
          </div>
          <ul>
            {group.items.map((item) => (
              <BudgetItemRow
                key={item.id}
                item={item}
                projectVendors={projectVendors}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function NeedsAttentionCard({ aggregates }: { aggregates: BudgetAggregates }) {
  const { overCategories, untrackedCategoryCount, categoryCount } =
    aggregates.needsAttention;

  const hasSignal =
    overCategories.length > 0 ||
    (categoryCount > 0 && untrackedCategoryCount > 0);

  return (
    <Card className="p-4 sm:p-5">
      <Eyebrow>Needs attention</Eyebrow>
      {!hasSignal ? (
        <p className="mt-3 text-[13px] text-ink-muted">All categories look good.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {overCategories.map((category) => (
            <li key={category} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rosewood"
                aria-hidden
              />
              <span className="min-w-0 text-[14px] leading-snug text-rosewood">
                {category} is over plan
              </span>
            </li>
          ))}
          {categoryCount > 0 && untrackedCategoryCount > 0 ? (
            <li className="flex items-start gap-2.5">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-plum"
                aria-hidden
              />
              <span className="min-w-0 text-[14px] leading-snug text-ink">
                {untrackedCategoryCount} of {categoryCount} categories have
                nothing tracked yet
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}

function BookedVendorsCard({ aggregates }: { aggregates: BudgetAggregates }) {
  const {
    bookedCount,
    bookedUnlinkedCount,
    bookedUnlinkedQuotedTotal,
    unlinkedVendors,
  } = aggregates.vendorReconciliation;

  if (bookedCount === 0) return null;

  if (bookedUnlinkedCount === 0) {
    return (
      <Card className="p-4 sm:p-5">
        <Eyebrow>Booked vendors</Eyebrow>
        <p className="mt-3 text-[14px] text-sage">
          All {bookedCount} booked vendors are linked to budget items.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <Eyebrow>Booked vendors</Eyebrow>
      <p className="mt-3 text-[14px] tabular-nums text-ink-muted">
        {bookedUnlinkedCount} booked vendors not linked ·{" "}
        {formatCurrency(bookedUnlinkedQuotedTotal)} quoted
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {unlinkedVendors.map((vendor) => (
          <li key={vendor.id} className="text-[13px] text-ink-muted">
            {vendor.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function BudgetBoard({
  projectId,
  aggregates,
  projectVendors,
}: BudgetBoardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of aggregates.perCategory) {
      initial[group.category] = true;
    }
    return initial;
  });

  function toggleCategory(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const empty = aggregates.perCategory.length === 0;

  return (
    <div className="space-y-5">
      <AllocationBand projectId={projectId} aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Eyebrow>By category</Eyebrow>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              aria-expanded={showAdd}
              className="text-[13px] font-medium text-plum hover:text-plum-deep"
            >
              {showAdd ? "Cancel" : "Add item"}
            </button>
          </div>

          {showAdd ? (
            <Card className="mb-4 p-4 sm:p-5">
              <AddBudgetItemForm
                projectId={projectId}
                onAdded={() => setShowAdd(false)}
              />
            </Card>
          ) : null}

          {empty ? (
            <EmptyState>
              Add your first budget item to start tracking categories.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {aggregates.perCategory.map((group) => (
                <CategorySection
                  key={group.category}
                  group={group}
                  collapsed={collapsed[group.category] !== false}
                  onToggle={() => toggleCategory(group.category)}
                  projectVendors={projectVendors}
                />
              ))}
            </ul>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <NeedsAttentionCard aggregates={aggregates} />
          <BookedVendorsCard aggregates={aggregates} />
        </aside>
      </div>
    </div>
  );
}
