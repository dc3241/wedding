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
  VENDOR_PIPELINE_STEPS,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { PHASE_ORDER, isCanonicalPhase } from "@/lib/checklist-phases";
import { cn } from "@/lib/cn";

type TaskSummary = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  phase: string | null;
};

type CoupleDashboardProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  tasks: TaskSummary[];
  vendors: OutreachVendor[];
};

const DUE_SOON_DAYS = 14;

function formatDueDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
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

function phaseDisplayLabel(phase: string, isCurrent: boolean) {
  let label: string;
  if (phase === "12+ months") label = "12 months out";
  else if (phase === "week of") label = "Week of";
  else if (phase.endsWith("months")) label = `${phase} out`;
  else label = phase;

  return isCurrent ? `${label} · you're here` : label;
}

function groupByPhase(tasks: TaskSummary[]) {
  const groups = new Map<string | null, TaskSummary[]>();
  for (const task of tasks) {
    const bucket = groups.get(task.phase) ?? [];
    bucket.push(task);
    groups.set(task.phase, bucket);
  }
  return groups;
}

function buildPhaseSections(tasks: TaskSummary[]) {
  const byPhase = groupByPhase(tasks);
  const knownPhases = PHASE_ORDER.map((phase) => ({ phase, label: phase }));
  const extraPhases = [...byPhase.keys()]
    .filter(
      (phase): phase is string =>
        phase !== null && !isCanonicalPhase(phase),
    )
    .sort()
    .map((phase) => ({ phase, label: phase }));

  return [...knownPhases, ...extraPhases].filter(
    ({ phase }) => (byPhase.get(phase)?.length ?? 0) > 0,
  );
}

function findCurrentPhaseIndex(
  sections: { phase: string | null }[],
  byPhase: Map<string | null, TaskSummary[]>,
) {
  for (let index = 0; index < sections.length; index++) {
    const phaseTasks = byPhase.get(sections[index].phase) ?? [];
    if (phaseTasks.some((task) => task.status !== "done")) return index;
  }
  return sections.length > 0 ? sections.length - 1 : -1;
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

function timelinePill(
  task: TaskSummary,
  phaseState: "done" | "current" | "upcoming",
): { variant: PillVariant; label: string } | null {
  if (phaseState === "upcoming") return null;
  if (task.status === "done") return { variant: "sage", label: "Done" };
  if (isOverdue(task.due_date)) return { variant: "rosewood", label: "Overdue" };
  if (isDueSoon(task.due_date)) return { variant: "clay", label: "Due soon" };
  if (task.status === "in_progress") {
    return { variant: "default", label: "In progress" };
  }
  return { variant: "default", label: "Not started" };
}

function vendorPipelineStep(vendor: OutreachVendor) {
  if (vendor.status === "booked") return 3;
  if (vendor.status === "contacted" && vendor.quoted_price !== null) return 2;
  if (vendor.status === "contacted") return 1;
  if (vendor.status === "to_contact") return 0;
  return 0;
}

function vendorPill(vendor: OutreachVendor): {
  variant: PillVariant;
  label: string;
} {
  switch (vendor.status) {
    case "booked":
      return { variant: "sage", label: "Booked" };
    case "declined":
      return { variant: "rosewood", label: "Declined" };
    case "contacted":
      return vendor.quoted_price !== null
        ? { variant: "clay", label: "Replied" }
        : { variant: "default", label: "Contacted" };
    default:
      return { variant: "default", label: "To contact" };
  }
}

function aggregatePipelineLitStep(vendors: OutreachVendor[]) {
  if (vendors.length === 0) return -1;

  let maxStep = -1;
  for (const vendor of vendors) {
    maxStep = Math.max(maxStep, vendorPipelineStep(vendor));
  }
  return maxStep;
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
      return 0;
    })
    .slice(0, 3);

  return (
    <section className="mt-12">
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
                Your timeline will show what to tackle next.
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

function TimelineSection({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskSummary[];
}) {
  const byPhase = groupByPhase(tasks);
  const sections = buildPhaseSections(tasks);
  const currentIndex = findCurrentPhaseIndex(sections, byPhase);

  return (
    <section className="mt-12">
      <BlockHead title="Your timeline" />

      {sections.length === 0 ? (
        <div className="px-1">
          <p className="text-[13px] text-ink-muted">
            Generate a starter timeline to see your phases here.
          </p>
          <div className="mt-3">
            <GenerateStarterChecklist projectId={projectId} compact />
          </div>
        </div>
      ) : (
        <div className="relative pl-7 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-stone">
          {sections.map(({ phase, label }, index) => {
            const phaseTasks = byPhase.get(phase) ?? [];
            const allDone = phaseTasks.every((task) => task.status === "done");
            const isCurrent = index === currentIndex;
            const phaseState: "done" | "current" | "upcoming" = allDone
              ? "done"
              : isCurrent
                ? "current"
                : index > currentIndex
                  ? "upcoming"
                  : "current";

            return (
              <div
                key={label}
                className={cn(
                  "relative pb-7 last:pb-0",
                  phaseState === "done" && "phase-done",
                )}
              >
                <span
                  className={cn(
                    "absolute top-[3px] -left-7 size-[11px] rounded-full border-[1.5px]",
                    phaseState === "done" && "border-sage bg-sage",
                    phaseState === "current" &&
                      "border-plum bg-plum shadow-[0_0_0_4px_var(--plum-tint)]",
                    phaseState === "upcoming" && "border-stone bg-surface",
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "text-[13px] font-medium",
                    phaseState === "current" ? "text-plum-deep" : "text-ink",
                  )}
                >
                  {phaseDisplayLabel(phase ?? label, isCurrent)}
                </div>
                <div className="mt-2.5 flex flex-col gap-[9px]">
                  {phaseTasks.map((task) => {
                    const pill = timelinePill(task, phaseState);
                    const muted =
                      phaseState === "upcoming" || task.status === "done";

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center justify-between gap-3 text-[15px]",
                          muted ? "text-ink-muted" : "text-ink",
                        )}
                      >
                        <span>{task.title}</span>
                        {pill ? (
                          <Pill variant={pill.variant} className="shrink-0">
                            {pill.label}
                          </Pill>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AggregateVendorStepper({ vendors }: { vendors: OutreachVendor[] }) {
  const litThrough = aggregatePipelineLitStep(vendors);

  return (
    <div className="mb-5 flex items-center">
      {VENDOR_PIPELINE_STEPS.map((step, index) => {
        const lit = index <= litThrough;
        const isLast = index === VENDOR_PIPELINE_STEPS.length - 1;

        return (
          <div
            key={step.id}
            className={cn("flex items-center gap-2.5", !isLast && "flex-1")}
          >
            <span
              className={cn(
                "size-[9px] shrink-0 rounded-full",
                lit ? "bg-plum" : "bg-stone",
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-xs",
                lit ? "font-medium text-plum-deep" : "text-ink-muted",
              )}
            >
              {step.label}
            </span>
            {!isLast ? <span className="h-px flex-1 bg-stone" aria-hidden /> : null}
          </div>
        );
      })}
    </div>
  );
}

function VendorsSection({
  projectId,
  vendors,
}: {
  projectId: string;
  vendors: OutreachVendor[];
}) {
  return (
    <section className="mt-12">
      <BlockHead
        title="Vendors"
        href={`/projects/${projectId}/vendors`}
        linkLabel="Manage outreach"
      />

      {vendors.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          Search local vendors or add your favorites to track outreach.
        </p>
      ) : (
        <>
          <AggregateVendorStepper vendors={vendors} />
          {vendors.map((item) => {
            const pill = vendorPill(item);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 border-b border-stone px-1 py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-[15px] text-ink">{item.vendor.name}</div>
                  {item.vendor.category ? (
                    <div className="mt-px text-[13px] text-ink-muted">
                      {item.vendor.category}
                    </div>
                  ) : null}
                </div>
                <Pill variant={pill.variant} className="shrink-0">
                  {pill.label}
                </Pill>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}

function BudgetSection({ vendors }: { vendors: OutreachVendor[] }) {
  const lineItems = vendors
    .filter((item) => item.quoted_price !== null)
    .map((item) => ({
      id: item.id,
      label: item.vendor.category
        ? `${item.vendor.category} — ${item.vendor.name}`
        : item.vendor.name,
      amount: item.quoted_price!,
      pending: item.status !== "booked",
    }));

  const committed = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const hasBudget = lineItems.length > 0;

  return (
    <section className="mt-12">
      <BlockHead title="Budget" />

      <Card className="p-6">
        {hasBudget ? (
          <>
            <div className="mb-3.5 flex items-baseline justify-between gap-4">
              <div className="tabnum text-[22px] font-medium text-ink">
                {formatCurrency(committed)}{" "}
                <span className="text-sm font-normal text-ink-muted">
                  committed
                </span>
              </div>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-stone"
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Budget committed"
            >
              <span className="block h-full w-full rounded-full bg-plum" />
            </div>
            <div className="mt-5">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-b border-stone px-1 py-3 text-[15px] last:border-b-0"
                >
                  <span className="min-w-0 text-ink">
                    {item.label}
                    {item.pending ? " — pending quote" : ""}
                  </span>
                  <span className="tabnum shrink-0 font-medium text-ink">
                    {item.pending ? "~" : ""}
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-ink-muted">
            Vendor quotes will appear here as you collect them.
          </p>
        )}
      </Card>
    </section>
  );
}

export function CoupleDashboard({
  projectId,
  coupleNames,
  weddingDate,
  tasks,
  vendors,
}: CoupleDashboardProps) {
  return (
    <>
      <WeddingHero
        coupleNames={coupleNames}
        weddingDate={weddingDate}
        projectId={projectId}
      />

      <NextUpSection projectId={projectId} tasks={tasks} />
      <TimelineSection projectId={projectId} tasks={tasks} />
      <VendorsSection projectId={projectId} vendors={vendors} />
      <BudgetSection vendors={vendors} />
    </>
  );
}
