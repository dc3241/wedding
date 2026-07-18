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
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";

type BudgetBoardProps = {
  projectId: string;
  projectName: string;
  weddingDate: string | null;
  aggregates: BudgetAggregates;
  projectVendors: ProjectVendorOption[];
};

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AllocationBand({
  projectId,
  aggregates,
}: {
  projectId: string;
  aggregates: BudgetAggregates;
}) {
  const { totalBudget, allocated, spent, committed, unallocated } = aggregates;

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

  const headlinePct =
    totalBudget !== null && totalBudget > 0
      ? Math.round((spent / totalBudget) * 100)
      : null;

  return (
    <Card className="p-[30px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          {headlinePct != null ? (
            <>
              <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
                {headlinePct}%
              </p>
              <p className="mt-2 text-[14px] font-medium text-muted">
                spent of {formatCurrency(totalBudget!)}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
                {formatCurrency(allocated)}
              </p>
              <p className="mt-2 text-[14px] font-medium text-muted">
                allocated · set a total to track %
              </p>
            </>
          )}
        </div>
        <div className="text-left md:text-right">
          <TotalBudgetEditor projectId={projectId} totalBudget={totalBudget} />
        </div>
      </div>

      {showBar ? (
        <div
          className="flex h-4 overflow-hidden rounded-[var(--radius-pill)] bg-[#EDE4E8] p-[3px]"
          role="img"
          aria-label={
            overAllocated
              ? "Budget fully allocated, over target"
              : `Spent ${formatCurrency(spent)}, committed ${formatCurrency(committed)} of ${formatCurrency(totalBudget)}`
          }
        >
          {spentPct > 0 ? (
            <div
              className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300"
              style={{ width: `${spentPct}%` }}
            />
          ) : null}
          {committedPct > 0 ? (
            <div
              className={cn(
                "h-full rounded-[var(--radius-pill)] transition-[width] duration-300",
                overAllocated ? "bg-rosewood" : "bg-accent",
              )}
              style={{ width: `${committedPct}%` }}
            />
          ) : null}
        </div>
      ) : null}

      <dl
        className={cn(
          "mt-6 grid gap-5",
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
      <dt className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 font-display text-[22px] font-extrabold tracking-[-0.03em] tabular-nums",
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
      <span className="text-[13px] font-medium tabular-nums text-muted">
        Nothing tracked of {formatCurrency(group.plannedTotal)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-[13px] font-medium tabular-nums",
        over ? "text-rosewood" : "text-muted",
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
    <div className="mt-3 h-2.5 overflow-hidden rounded-[var(--radius-pill)] bg-[#EDE4E8] p-0.5">
      {!untracked && pct > 0 ? (
        <div
          className={cn(
            "h-full rounded-[var(--radius-pill)] transition-[width] duration-300",
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
  open,
  onToggle,
  projectVendors,
}: {
  group: BudgetCategoryGroup;
  open: boolean;
  onToggle: () => void;
  projectVendors: ProjectVendorOption[];
}) {
  return (
    <details
      className="mb-4 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised last:mb-0"
      open={open}
    >
      <summary
        className="cursor-pointer list-none px-6 py-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <div className="flex items-baseline justify-between gap-x-3">
          <span className="truncate font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {group.category}
          </span>
          <CategoryFigure group={group} />
        </div>
        <CategoryBar group={group} />
      </summary>

      {open ? (
        <div className="px-3.5 pb-3.5">
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_96px_96px_52px] gap-x-2 px-4 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
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
    </details>
  );
}

function NeedsAttentionCard({ aggregates }: { aggregates: BudgetAggregates }) {
  const { overCategories, untrackedCategoryCount, categoryCount } =
    aggregates.needsAttention;

  const hasSignal =
    overCategories.length > 0 ||
    (categoryCount > 0 && untrackedCategoryCount > 0);

  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Needs attention
      </p>
      {!hasSignal ? (
        <p className="text-[15px] font-medium text-muted">
          All categories look good.
        </p>
      ) : (
        <ul>
          {overCategories.map((category) => (
            <li
              key={category}
              className="border-t border-hairline py-[11px] text-[15px] font-medium leading-snug text-rosewood first:border-t-0 first:pt-0"
            >
              {category} is over plan
            </li>
          ))}
          {categoryCount > 0 && untrackedCategoryCount > 0 ? (
            <li className="border-t border-hairline py-[11px] text-[15px] font-medium leading-snug text-ink first:border-t-0 first:pt-0">
              {untrackedCategoryCount} of {categoryCount} categories have
              nothing tracked yet
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
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Booked vendors
        </p>
        <p className="text-[15px] font-medium text-sage">
          All {bookedCount} booked vendors are linked to budget items.
        </p>
      </Card>
    );
  }

  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Booked vendors
      </p>
      <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {bookedUnlinkedCount}
      </p>
      <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
        booked vendors not linked · {formatCurrency(bookedUnlinkedQuotedTotal)}{" "}
        quoted
      </p>
      <ul className="mt-3">
        {unlinkedVendors.map((vendor) => (
          <li
            key={vendor.id}
            className="border-t border-hairline py-[11px] text-[15px] font-medium text-ink first:border-t-0 first:pt-0"
          >
            {vendor.name}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function BudgetBoard({
  projectId,
  projectName,
  weddingDate,
  aggregates,
  projectVendors,
}: BudgetBoardProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const group of aggregates.perCategory) {
        initial[group.category] = group.isOver;
      }
      return initial;
    },
  );

  function toggleCategory(key: string) {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const empty = aggregates.perCategory.length === 0;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget" eyebrow={eyebrow} />

      <AllocationBand projectId={projectId} aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] font-medium text-muted">
              {aggregates.perCategory.length}{" "}
              {aggregates.perCategory.length === 1 ? "category" : "categories"}
            </p>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              aria-expanded={showAdd}
              aria-pressed={showAdd}
              className={cn(
                "rounded-[var(--radius-pill)] px-4 py-2.5 text-[14px] font-semibold transition-colors",
                showAdd
                  ? "bg-accent text-surface"
                  : "bg-accent-wash text-accent",
              )}
            >
              {showAdd ? "Cancel" : "Add item"}
            </button>
          </div>

          {showAdd ? (
            <Card className="mb-4 px-6 py-5">
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
            <div>
              {aggregates.perCategory.map((group) => (
                <CategorySection
                  key={group.category}
                  group={group}
                  open={Boolean(openCategories[group.category])}
                  onToggle={() => toggleCategory(group.category)}
                  projectVendors={projectVendors}
                />
              ))}
            </div>
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
