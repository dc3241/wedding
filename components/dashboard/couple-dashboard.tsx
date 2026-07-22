import Link from "next/link";
import { GenerateStarterChecklist } from "@/components/checklist/GenerateStarterChecklist";
import {
  Card,
  Pill,
  type PillVariant,
  WeddingHero,
} from "@/components/ui";
import {
  OUTREACH_STATUS_HEADING,
  OUTREACH_STATUS_ORDER,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import {
  computeChecklistAggregates,
  type AggregateTask,
} from "@/lib/checklist-aggregates";
import {
  computeBudgetAggregates,
  type ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/cn";

type TaskSummary = AggregateTask;

type BudgetItemInput = {
  id: string;
  category: string | null;
  label: string;
  planned_amount: number;
  actual_amount: number | null;
  notes: string | null;
  project_vendor_id: string | null;
};

type GuestStats = {
  invited: number;
  attending: number;
  declined: number;
  pending: number;
  householdCount: number;
};

type CoupleDashboardProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  tasks: TaskSummary[];
  vendors: OutreachVendor[];
  totalBudget: number | null;
  budgetItems: BudgetItemInput[];
  guestStats: GuestStats;
  website: { published: boolean } | null;
};

const DUE_SOON_DAYS = 14;

function formatDueDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return daysUntil(dueDate) < 0;
}

function isDueSoon(dueDate: string | null) {
  if (!dueDate) return false;
  const days = daysUntil(dueDate);
  return days >= 0 && days <= DUE_SOON_DAYS;
}

function focusPill(task: TaskSummary): { variant: PillVariant; label: string } {
  if (isOverdue(task.due_date)) {
    return { variant: "rosewood", label: "Overdue" };
  }
  if (isDueSoon(task.due_date)) {
    const days = daysUntil(task.due_date!);
    return {
      variant: "clay",
      label: days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`,
    };
  }
  if (task.status === "in_progress") {
    return { variant: "clay", label: "In progress" };
  }
  return { variant: "default", label: "Not started" };
}

function focusMeta(task: TaskSummary) {
  if (task.status === "in_progress") return "In progress";
  if (isOverdue(task.due_date)) {
    return `Was due ${formatDueDate(task.due_date!)}`;
  }
  if (task.due_date) {
    return `Due ${formatDueDate(task.due_date)}`;
  }
  return "Not started yet";
}

function BlockHead({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        {title}
      </p>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-[14px] font-semibold text-accent no-underline hover:opacity-80"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

function NextUpSection({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskSummary[];
}) {
  const focusTasks = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return a.position - b.position;
    })
    .slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-[22px]">
        <BlockHead
          title="Next up"
          href={`/projects/${projectId}/checklist`}
          linkLabel="See full checklist"
        />
      </div>

      {focusTasks.length === 0 ? (
        <div className="px-6 pb-[22px]">
          {tasks.length === 0 ? (
            <div className="space-y-3">
              <p className="text-[15px] font-medium text-muted">
                Your checklist will show what to tackle next.
              </p>
              <GenerateStarterChecklist projectId={projectId} compact />
            </div>
          ) : (
            <p className="text-[15px] font-medium text-muted">
              You&apos;re all caught up — nice work.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2 px-3.5 pb-3.5">
          {focusTasks.map((task) => {
            const pill = focusPill(task);
            return (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-snug text-ink">
                    {task.title}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">{focusMeta(task)}</p>
                </div>
                <Pill variant={pill.variant} className="shrink-0">
                  {pill.label}
                </Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function YourPhasesSection({
  projectId,
  tasks,
  weddingDate,
}: {
  projectId: string;
  tasks: TaskSummary[];
  weddingDate: string | null;
}) {
  const aggregates = computeChecklistAggregates(tasks, weddingDate);
  const { phases, activePhase, total, percent, done } = aggregates;

  return (
    <Card className="p-[30px]">
      <BlockHead
        title="Your phases"
        href={`/projects/${projectId}/checklist`}
        linkLabel="Open checklist"
      />

      {total === 0 ? (
        <div>
          <p className="text-[15px] font-medium text-muted">
            Generate a starter checklist to see your phases here.
          </p>
          <div className="mt-4">
            <GenerateStarterChecklist projectId={projectId} compact />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
              {percent}%
            </p>
            <p className="mt-2 text-[14px] font-medium text-muted">
              {done} of {total} done
            </p>
          </div>
          <div
            className="mb-6 h-4 overflow-hidden rounded-[var(--radius-pill)] bg-[#EDE4E8] p-[3px]"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% of checklist complete`}
          >
            <div
              className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {phases.map((phase) => {
              const here = phase.phase === activePhase;
              return (
                <li
                  key={phase.phase}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-pill)] px-[15px] py-[9px] text-[13px] font-semibold tabular-nums",
                    here ? "bg-accent text-surface" : "bg-well text-muted",
                  )}
                >
                  <span>{phase.phase}</span>
                  <span
                    className={cn(
                      "font-medium",
                      here ? "opacity-90" : "opacity-75",
                    )}
                  >
                    {phase.done} of {phase.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

function BudgetRailCard({
  projectId,
  totalBudget,
  budgetItems,
  vendors,
}: {
  projectId: string;
  totalBudget: number | null;
  budgetItems: BudgetItemInput[];
  vendors: OutreachVendor[];
}) {
  const projectVendors: ProjectVendorOption[] = vendors.map((v) => ({
    id: v.id,
    name: v.vendor.name,
    quoted_price: v.quoted_price,
    status: v.status,
  }));

  const aggregates = computeBudgetAggregates(
    budgetItems,
    totalBudget,
    projectVendors,
  );
  const { allocated, spent, unallocated } = aggregates;
  const overAllocated = unallocated !== null && unallocated < 0;

  const spentPct =
    allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;

  return (
    <Link
      href={`/projects/${projectId}/budget`}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Budget
        </p>
        {budgetItems.length === 0 ? (
          <p className="text-[15px] font-medium text-muted">
            No budget items yet.
          </p>
        ) : (
          <>
            <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
              {formatCurrency(spent)}
            </p>
            <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
              spent of {formatCurrency(allocated)} allocated
            </p>
            <div
              className="mt-4 h-2.5 overflow-hidden rounded-[var(--radius-pill)] bg-[#EDE4E8] p-0.5"
              role="img"
              aria-label={`Spent ${formatCurrency(spent)} of ${formatCurrency(allocated)} allocated`}
            >
              {spentPct > 0 ? (
                <div
                  className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300"
                  style={{ width: `${spentPct}%` }}
                />
              ) : null}
            </div>
            {unallocated !== null ? (
              <p
                className={cn(
                  "mt-3 text-[13px] font-medium tabular-nums",
                  overAllocated ? "text-rosewood" : "text-muted",
                )}
              >
                {overAllocated
                  ? `${formatCurrency(Math.abs(unallocated))} over target`
                  : `${formatCurrency(unallocated)} unallocated`}
              </p>
            ) : null}
          </>
        )}
      </Card>
    </Link>
  );
}

function VendorsRailCard({
  projectId,
  vendors,
}: {
  projectId: string;
  vendors: OutreachVendor[];
}) {
  const counts = Object.fromEntries(
    OUTREACH_STATUS_ORDER.map((status) => [
      status,
      vendors.filter((v) => v.status === status).length,
    ]),
  ) as Record<(typeof OUTREACH_STATUS_ORDER)[number], number>;

  return (
    <Link
      href={`/projects/${projectId}/vendors`}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Vendors
        </p>
        {vendors.length === 0 ? (
          <p className="text-[15px] font-medium text-muted">
            No vendors on your list yet.
          </p>
        ) : (
          <>
            <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
              {vendors.length}
            </p>
            <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
              on your list
            </p>
            <ul className="mt-3">
              {OUTREACH_STATUS_ORDER.map((status) => {
                const n = counts[status];
                if (n === 0) return null;
                return (
                  <li
                    key={status}
                    className="flex items-baseline justify-between gap-3 border-t border-hairline py-[11px] text-[15px] font-medium first:border-t-0 first:pt-0"
                  >
                    <span className="text-muted">
                      {OUTREACH_STATUS_HEADING[status]}
                    </span>
                    <span className="tabular-nums text-ink">{n}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </Link>
  );
}

function GuestsRailCard({
  projectId,
  guestStats,
}: {
  projectId: string;
  guestStats: GuestStats;
}) {
  return (
    <Link
      href={`/projects/${projectId}/guests`}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Guests
        </p>
        {guestStats.householdCount === 0 ? (
          <p className="text-[15px] font-medium text-muted">No guests yet.</p>
        ) : (
          <>
            <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
              {guestStats.invited}
            </p>
            <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
              invited
            </p>
            <ul className="mt-3">
              {(
                [
                  ["Attending", guestStats.attending],
                  ["Pending", guestStats.pending],
                  ["Declined", guestStats.declined],
                ] as const
              ).map(([label, value], i) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-baseline justify-between gap-3 py-[11px] text-[15px] font-medium",
                    i > 0 && "border-t border-hairline",
                  )}
                >
                  <span className="text-muted">{label}</span>
                  <span className="tabular-nums text-ink">{value}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </Link>
  );
}

function WebsiteRailCard({
  projectId,
  website,
}: {
  projectId: string;
  website: { published: boolean } | null;
}) {
  return (
    <Link
      href={`/projects/${projectId}/website`}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Website
        </p>
        {website === null ? (
          <p className="text-[15px] font-medium text-muted">
            No website yet — create one.
          </p>
        ) : website.published ? (
          <>
            <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-sage">
              Live
            </p>
            <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
              Your site is published
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              Draft
            </p>
            <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
              Ready when you are
            </p>
          </>
        )}
      </Card>
    </Link>
  );
}

export function CoupleDashboard({
  projectId,
  coupleNames,
  weddingDate,
  tasks,
  vendors,
  totalBudget,
  budgetItems,
  guestStats,
  website,
}: CoupleDashboardProps) {
  return (
    <div className="space-y-6">
      <WeddingHero
        coupleNames={coupleNames}
        weddingDate={weddingDate}
        projectId={projectId}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <NextUpSection projectId={projectId} tasks={tasks} />
          <YourPhasesSection
            projectId={projectId}
            tasks={tasks}
            weddingDate={weddingDate}
          />
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <BudgetRailCard
            projectId={projectId}
            totalBudget={totalBudget}
            budgetItems={budgetItems}
            vendors={vendors}
          />
          <VendorsRailCard projectId={projectId} vendors={vendors} />
          <GuestsRailCard projectId={projectId} guestStats={guestStats} />
          <WebsiteRailCard projectId={projectId} website={website} />
        </aside>
      </div>
    </div>
  );
}
