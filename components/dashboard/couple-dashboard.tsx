import Link from "next/link";
import { GenerateStarterChecklist } from "@/components/checklist/GenerateStarterChecklist";
import {
  Card,
  Eyebrow,
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
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
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
    return { variant: "default", label: "In progress" };
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
    <div className="mb-[18px] flex items-baseline justify-between">
      <Eyebrow>{title}</Eyebrow>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-[13px] text-plum no-underline hover:text-plum-deep"
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
    <section>
      <BlockHead
        title="Next up"
        href={`/projects/${projectId}/checklist`}
        linkLabel="See full checklist"
      />

      {focusTasks.length === 0 ? (
        <div className="px-1 py-4">
          {tasks.length === 0 ? (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-muted">
                Your checklist will show what to tackle next.
              </p>
              <GenerateStarterChecklist projectId={projectId} compact />
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">
              You&apos;re all caught up — nice work.
            </p>
          )}
        </div>
      ) : (
        focusTasks.map((task) => {
          const pill = focusPill(task);
          return (
            <div
              key={task.id}
              className="flex items-center justify-between gap-4 border-b border-stone px-1 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-base text-ink">{task.title}</div>
                <div className="mt-0.5 text-[13px] text-ink-muted">
                  {focusMeta(task)}
                </div>
              </div>
              <Pill variant={pill.variant} className="shrink-0">
                {pill.label}
              </Pill>
            </div>
          );
        })
      )}
    </section>
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
  const { phases, activePhase, total } = aggregates;

  return (
    <section>
      <BlockHead
        title="Your phases"
        href={`/projects/${projectId}/checklist`}
        linkLabel="Open checklist"
      />

      {total === 0 ? (
        <div className="px-1">
          <p className="text-[13px] text-ink-muted">
            Generate a starter checklist to see your phases here.
          </p>
          <div className="mt-3">
            <GenerateStarterChecklist projectId={projectId} compact />
          </div>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {phases.map((phase) => {
            const here = phase.phase === activePhase;
            return (
              <li
                key={phase.phase}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] tabular-nums",
                  here
                    ? "border-plum text-plum"
                    : "border-stone text-ink-muted",
                )}
              >
                <span className={here ? "font-medium text-plum-deep" : undefined}>
                  {phase.phase}
                </span>
                <span className="text-ink-muted">
                  {" "}
                  · {phase.done}/{phase.total}
                </span>
                {here ? (
                  <span className="ml-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-plum">
                    you&apos;re here
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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

  // Bar tracks SPEND against ALLOCATED (BUD-01 CategoryBar vocabulary) —
  // allocation-vs-target is the separate text line below, never a fill.
  const spentPct =
    allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;

  return (
    <Link
      href={`/projects/${projectId}/budget`}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      <Card className="p-4 sm:p-5">
        <Eyebrow>Budget</Eyebrow>
        {budgetItems.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            No budget items yet.
          </p>
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  Allocated
                </dt>
                <dd className="mt-1 text-[18px] tabular-nums text-ink">
                  {formatCurrency(allocated)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  Spent
                </dt>
                <dd className="mt-1 text-[18px] tabular-nums text-ink">
                  {formatCurrency(spent)}
                </dd>
              </div>
            </dl>
            <div
              className="mt-3 h-[3px] overflow-hidden rounded-[2px] bg-stone/40"
              role="img"
              aria-label={`Spent ${formatCurrency(spent)} of ${formatCurrency(allocated)} allocated`}
            >
              {spentPct > 0 ? (
                <div
                  className="h-full bg-sage transition-[width] duration-300"
                  style={{ width: `${spentPct}%` }}
                />
              ) : null}
            </div>
            {unallocated !== null ? (
              <p
                className={cn(
                  "mt-2 text-[13px] tabular-nums",
                  overAllocated ? "text-rosewood" : "text-ink-muted",
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
      <Card className="p-4 sm:p-5">
        <Eyebrow>Vendors</Eyebrow>
        {vendors.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            No vendors on your list yet.
          </p>
        ) : (
          <dl className="mt-3 space-y-2 text-[14px]">
            {OUTREACH_STATUS_ORDER.map((status) => {
              const n = counts[status];
              if (n === 0) return null;
              return (
                <div
                  key={status}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-ink-muted">
                    {OUTREACH_STATUS_HEADING[status]}
                  </dt>
                  <dd className="tabular-nums text-ink">{n}</dd>
                </div>
              );
            })}
            <div className="flex items-baseline justify-between gap-3 border-t border-stone pt-2">
              <dt className="text-ink-muted">Total</dt>
              <dd className="tabular-nums font-medium text-ink">
                {vendors.length}
              </dd>
            </div>
          </dl>
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
      <Card className="p-4 sm:p-5">
        <Eyebrow>Guests</Eyebrow>
        {guestStats.householdCount === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">No guests yet.</p>
        ) : (
          <dl className="mt-3 space-y-2 text-[14px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Invited</dt>
              <dd className="tabular-nums text-ink">{guestStats.invited}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Attending</dt>
              <dd className="tabular-nums text-ink">{guestStats.attending}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Pending</dt>
              <dd className="tabular-nums text-ink">{guestStats.pending}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Declined</dt>
              <dd className="tabular-nums text-ink">{guestStats.declined}</dd>
            </div>
          </dl>
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
      <Card className="p-4 sm:p-5">
        <Eyebrow>Website</Eyebrow>
        {website === null ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            No website yet — create one.
          </p>
        ) : (
          <p className="mt-3 text-[14px] text-ink">
            {website.published ? (
              <span className="text-sage">Published</span>
            ) : (
              <span className="text-ink-muted">Draft</span>
            )}
          </p>
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
    <>
      <WeddingHero
        coupleNames={coupleNames}
        weddingDate={weddingDate}
        projectId={projectId}
      />

      <div className="mt-10 grid grid-cols-1 gap-6 text-left lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-10">
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
    </>
  );
}
