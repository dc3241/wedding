"use client";

import { useState, useTransition } from "react";
import { AddBudgetItemForm } from "./AddBudgetItemForm";
import { BudgetItemRow } from "./BudgetItemRow";
import {
  BudgetFilterBar,
  itemMatchesStatus,
  statusMatchLabel,
  todayLocalDateKey,
  type BudgetStatusFilter,
} from "./BudgetFilterBar";
import { BudgetQuickAdd } from "./BudgetQuickAdd";
import { TotalBudgetEditor } from "./TotalBudgetEditor";
import { dismissBudgetAlert } from "./actions";
import type {
  BudgetAggregates,
  BudgetCategoryGroup,
  BudgetItemForAggregate,
  ProjectVendorOption,
  VendorPackageStats,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

type BudgetBoardProps = {
  projectId: string;
  projectName: string;
  weddingDate: string | null;
  aggregates: BudgetAggregates;
  projectVendors: ProjectVendorOption[];
};

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
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
  const {
    totalBudget,
    allocated,
    actualTotal,
    paidTotal,
    committed,
    unallocated,
  } = aggregates;

  const overAllocated = unallocated !== null && unallocated < 0;
  const showBar = totalBudget !== null;

  // "Paid so far" bar = paidTotal / total_budget (ledger only — never actual).
  let paidPct = 0;
  let committedPct = 0;
  if (showBar && totalBudget > 0) {
    if (overAllocated) {
      const fillBase = allocated > 0 ? allocated : totalBudget;
      paidPct = Math.min(100, (paidTotal / fillBase) * 100);
      committedPct = Math.min(100 - paidPct, (committed / fillBase) * 100);
    } else {
      paidPct = Math.min(100, (paidTotal / totalBudget) * 100);
      committedPct = Math.min(
        100 - paidPct,
        (committed / totalBudget) * 100,
      );
    }
  } else if (showBar && overAllocated) {
    paidPct = allocated > 0 ? Math.min(100, (paidTotal / allocated) * 100) : 0;
    committedPct = Math.min(100 - paidPct, 100);
  }

  const headlinePct =
    totalBudget !== null && totalBudget > 0
      ? Math.round((paidTotal / totalBudget) * 100)
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
                paid so far of {formatCurrency(totalBudget!)}
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
              : `Paid ${formatCurrency(paidTotal)}, committed ${formatCurrency(committed)} of ${formatCurrency(totalBudget)}`
          }
        >
          {paidPct > 0 ? (
            <div
              className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300"
              style={{ width: `${paidPct}%` }}
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
            ? "grid-cols-2 sm:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        )}
      >
        <StatCell label="Allocated" value={formatCurrency(allocated)} />
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
        <StatCell label="Actual" value={formatCurrency(actualTotal)} />
        <StatCell label="Paid so far" value={formatCurrency(paidTotal)} />
        <StatCell label="Committed" value={formatCurrency(committed)} />
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

function formatSignedCurrency(amount: number) {
  const abs = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `−${abs}`;
  return abs;
}

/** Paid / Actual ramp — full-group paidTotal vs actualTotal. Over-plan is NOT on the bar. */
function CategoryBar({
  category,
  actualTotal,
  paidTotal,
}: {
  category: string;
  actualTotal: number;
  paidTotal: number;
}) {
  let fillPct = 0;
  let fillTone: "rosewood" | "clay" | "sage" | null = null;

  if (actualTotal > 0) {
    const fraction = Math.min(1, Math.max(0, paidTotal / actualTotal));
    fillPct = fraction * 100;
    fillTone =
      fraction < 0.5 ? "rosewood" : fraction < 1 ? "clay" : "sage";
  }

  return (
    <div
      data-tour="budget-category-ramp"
      className="mt-3 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fillPct)}
      aria-label={
        actualTotal === 0
          ? `${category} · nothing tracked`
          : `${category} · ${Math.round(fillPct)}% paid`
      }
    >
      {fillTone != null && fillPct > 0 ? (
        <div
          className={cn(
            "h-full rounded-[var(--radius-pill)] transition-[width] duration-300",
            fillTone === "rosewood" && "bg-rosewood",
            fillTone === "clay" && "bg-clay",
            fillTone === "sage" && "bg-sage",
          )}
          style={{ width: `${fillPct}%` }}
        />
      ) : null}
    </div>
  );
}

function CategorySection({
  projectId,
  group,
  visibleItems,
  matchBadge,
  open,
  onToggle,
  projectVendors,
  allItems,
  todayKey,
}: {
  projectId: string;
  group: BudgetCategoryGroup;
  visibleItems: BudgetItemForAggregate[];
  matchBadge: string | null;
  open: boolean;
  onToggle: () => void;
  projectVendors: ProjectVendorOption[];
  allItems: BudgetItemForAggregate[];
  todayKey: string;
}) {
  // Full-group ledger sum — never visibleItems (filter must not move the bar).
  const paidTotal = group.items.reduce((sum, item) => sum + item.paid, 0);
  const hasActual = group.actualTotal > 0;
  const difference = group.plannedTotal - group.actualTotal;
  const differenceTone =
    group.actualTotal > group.plannedTotal ? "text-rosewood" : "text-sage";

  // Next-due derivation UNCHANGED — earliest among visibleItems.
  const nextDues = visibleItems
    .map((item) => item.nextDue)
    .filter((due): due is NonNullable<typeof due> => due != null)
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const earliestNext = nextDues[0] ?? null;
  const earliestPast =
    earliestNext != null && earliestNext.due_on < todayKey;

  return (
    <details
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised",
        open && "[grid-column:1/-1]",
      )}
      open={open}
    >
      <summary
        className="cursor-pointer list-none px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        {/* (a) Label · Actual (display-only; blank when nothing tracked) */}
        <div className="flex items-baseline justify-between gap-x-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-medium text-ink">
              {group.category}
            </span>
            {matchBadge ? <Pill>{matchBadge}</Pill> : null}
          </span>
          {hasActual ? (
            <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
              {formatCurrency(group.actualTotal)}
            </span>
          ) : null}
        </div>

        {/* (b) Paid / Actual progress ramp */}
        <CategoryBar
          category={group.category}
          actualTotal={group.actualTotal}
          paidTotal={paidTotal}
        />

        <div data-tour="budget-paid-due" className="mt-2 space-y-1">
          {/* (c) Total paid — full-group ledger sum */}
          <p className="text-[13px] font-medium tabular-nums text-ink">
            Total paid{"  "}
            {formatCurrency(paidTotal)}
          </p>

          {/* (d) Next due — earliest unpaid in category (existing derivation) */}
          {earliestNext ? (
            <p
              className={cn(
                "text-[13px] font-medium tabular-nums",
                earliestPast ? "text-rosewood" : "text-muted",
              )}
            >
              {formatCurrency(earliestNext.amount)} next due{" "}
              {new Date(earliestNext.due_on + "T00:00:00").toLocaleDateString(
                "en-US",
                { day: "numeric", month: "short" },
              )}
              {earliestPast ? " · past due" : ""}
            </p>
          ) : null}
        </div>

        {/* (e)+(f) Hairline · Budget (plannedTotal) + over-plan Difference delta */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline pt-3">
          <span className="text-[13px] font-medium text-muted">Budget</span>
          <span className="text-[13px] font-medium tabular-nums text-ink">
            {formatCurrency(group.plannedTotal)}
          </span>
          {/* Difference only when expanded — collapsed face stays Budget-only */}
          {open && hasActual ? (
            <span
              className={cn(
                "text-[13px] font-medium tabular-nums",
                differenceTone,
              )}
            >
              {formatSignedCurrency(difference)}
            </span>
          ) : null}
        </div>
      </summary>

      {open ? (
        <div className="px-3.5 pb-3.5">
          <ul>
            {visibleItems.map((item) => (
              <BudgetItemRow
                key={item.id}
                projectId={projectId}
                item={item}
                projectVendors={projectVendors}
                allItems={allItems}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </details>
  );
}

function NeedsAttentionCard({
  projectId,
  aggregates,
}: {
  projectId: string;
  aggregates: BudgetAggregates;
}) {
  const { overCategories, untrackedCategoryCount, categoryCount } =
    aggregates.needsAttention;
  const [isPending, startTransition] = useTransition();

  const hasSignal =
    overCategories.length > 0 ||
    (categoryCount > 0 && untrackedCategoryCount > 0);

  function handleIgnore(category: string, overage: number) {
    startTransition(async () => {
      await dismissBudgetAlert(projectId, category, overage);
    });
  }

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
          {overCategories.map(({ category, overage }) => (
            <li
              key={category}
              className="flex items-start justify-between gap-3 border-t border-hairline py-[11px] first:border-t-0 first:pt-0"
            >
              <span className="text-[15px] font-medium leading-snug text-rosewood">
                {category} is over plan
              </span>
              <button
                type="button"
                onClick={() => handleIgnore(category, overage)}
                disabled={isPending}
                className="shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                Ignore
              </button>
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
          {bookedCount === 1
            ? "All 1 booked vendor is linked to budget items."
            : `All ${bookedCount} booked vendors are linked to budget items.`}
        </p>
      </Card>
    );
  }

  const vendorWord = bookedUnlinkedCount === 1 ? "vendor" : "vendors";

  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Booked vendors
      </p>
      <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {bookedUnlinkedCount}
      </p>
      <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
        booked {vendorWord} not linked ·{" "}
        {formatCurrency(bookedUnlinkedQuotedTotal)} quoted
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

function PackageVarianceCard({ packages }: { packages: VendorPackageStats[] }) {
  const multi = packages.filter((pkg) => pkg.linkedItemCount > 1);
  if (multi.length === 0) return null;

  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Package variance
      </p>
      <ul>
        {multi.map((pkg) => {
          const hasVariance = pkg.variance != null && pkg.quotedPrice != null;
          const over = hasVariance && pkg.variance! > 0;
          const equal = hasVariance && pkg.variance === 0;
          const varianceLabel = !hasVariance
            ? null
            : equal
              ? "on plan"
              : over
                ? `${formatCurrency(pkg.variance!)} over plan`
                : `${formatCurrency(Math.abs(pkg.variance!))} under plan`;

          return (
            <li
              key={pkg.id}
              className="border-t border-hairline py-[11px] first:border-t-0 first:pt-0"
            >
              <p className="text-[15px] font-medium text-ink">{pkg.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                <span className="tabular-nums">
                  {pkg.quotedPrice == null
                    ? "No quote"
                    : `${formatCurrency(pkg.quotedPrice)} quoted`}
                </span>
                {" · "}
                <span className="tabular-nums">
                  {formatCurrency(pkg.sumPlanned)} planned across{" "}
                  {pkg.linkedItemCount} lines
                </span>
                {varianceLabel ? (
                  <>
                    {" · "}
                    <span
                      className={cn(
                        "tabular-nums",
                        over ? "text-rosewood" : "text-muted",
                      )}
                    >
                      {varianceLabel}
                    </span>
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
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
  const [statusFilter, setStatusFilter] = useState<BudgetStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  // One open at a time — seed with the first over-plan category if any.
  const [openCategory, setOpenCategory] = useState<string | null>(() => {
    const firstOver = aggregates.perCategory.find((group) => group.isOver);
    return firstOver?.category ?? null;
  });

  function toggleCategory(key: string) {
    setOpenCategory((prev) => (prev === key ? null : key));
  }

  const todayKey = todayLocalDateKey();
  const empty = aggregates.perCategory.length === 0;
  const allItems = aggregates.perCategory.flatMap((group) => group.items);
  const categoryOptions = aggregates.perCategory.map((group) => group.category);

  const filteredGroups = aggregates.perCategory
    .filter(
      (group) => categoryFilter === "" || group.category === categoryFilter,
    )
    .map((group) => {
      const visibleItems = group.items.filter((item) =>
        itemMatchesStatus(item, statusFilter, todayKey),
      );
      return {
        group,
        visibleItems,
        matchBadge: statusMatchLabel(statusFilter, visibleItems.length),
      };
    })
    .filter((row) => row.visibleItems.length > 0);

  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  const filtersActive = statusFilter !== "all" || categoryFilter !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        eyebrow={eyebrow}
        actions={<TourHelpButton tourKey="budget" />}
      />

      <AllocationBand projectId={projectId} aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] font-medium text-muted">
              {aggregates.perCategory.length}{" "}
              {aggregates.perCategory.length === 1 ? "category" : "categories"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <BudgetQuickAdd projectId={projectId} />
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
            <EmptyState
              action={
                <AskAssistantPrompt
                  prefill={ASSISTANT_PREFILLS.budget}
                  title="Estimate a starting budget"
                  description="Break it down by category from your guest count and priorities."
                  cta="Estimate budget"
                />
              }
            >
              Add your first budget item to start tracking categories.
            </EmptyState>
          ) : (
            <div className="space-y-4">
              <BudgetFilterBar
                status={statusFilter}
                onStatusChange={setStatusFilter}
                category={categoryFilter}
                onCategoryChange={setCategoryFilter}
                categories={categoryOptions}
              />

              {filteredGroups.length === 0 ? (
                <EmptyState>
                  {filtersActive
                    ? "No items match these filters."
                    : "Add your first budget item to start tracking categories."}
                </EmptyState>
              ) : (
                <div
                  data-tour="budget-categories"
                  className="grid gap-4"
                  style={{
                    // Cap at 4 cols: track min is at least ~1/4 of the row (3× gap-4).
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, max(180px, calc((100% - 3rem) / 4))), 1fr))",
                  }}
                >
                  {filteredGroups.map(({ group, visibleItems, matchBadge }) => (
                    <CategorySection
                      key={group.category}
                      projectId={projectId}
                      group={group}
                      visibleItems={visibleItems}
                      matchBadge={matchBadge}
                      open={openCategory === group.category}
                      onToggle={() => toggleCategory(group.category)}
                      projectVendors={projectVendors}
                      allItems={allItems}
                      todayKey={todayKey}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <NeedsAttentionCard projectId={projectId} aggregates={aggregates} />
          <BookedVendorsCard aggregates={aggregates} />
          <PackageVarianceCard packages={aggregates.vendorPackages} />
        </aside>
      </div>
    </div>
  );
}
