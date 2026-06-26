import Link from "next/link";
import { NewWeddingForm } from "@/components/projects/new-wedding-form";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import type { PlannerProjectSummary, UrgentItem } from "@/lib/dashboard-aggregates";
import { cn } from "@/lib/cn";

type AccountDashboardProps = {
  projects: PlannerProjectSummary[];
  activeWeddings: number;
  tasksDueThisWeek: number;
  vendorsNeedingAction: number;
  urgentItems: UrgentItem[];
};

function formatWeddingDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(date + "T00:00:00");
  return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / 86_400_000));
}

function urgentLabel(item: UrgentItem) {
  if (item.kind === "task") {
    return item.overdue ? "Overdue" : "Due soon";
  }
  return item.status === "to_contact" ? "To contact" : "Awaiting reply";
}

function urgentVariant(item: UrgentItem): "rosewood" | "clay" | undefined {
  if (item.kind === "task") {
    return item.overdue ? "rosewood" : "clay";
  }
  return undefined;
}

function urgentHref(item: UrgentItem) {
  if (item.kind === "task") {
    return `/projects/${item.projectId}/checklist`;
  }
  return `/projects/${item.projectId}/vendors`;
}

function urgentTitle(item: UrgentItem) {
  if (item.kind === "task") return item.title;
  return item.vendorName;
}

export function AccountDashboard({
  projects,
  activeWeddings,
  tasksDueThisWeek,
  vendorsNeedingAction,
  urgentItems,
}: AccountDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Planning"
          title="Dashboard"
          description="Your weddings at a glance."
        />
        <NewWeddingForm />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {activeWeddings}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">Active weddings</div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {tasksDueThisWeek}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">Tasks due this week</div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="tabnum text-[26px] font-medium text-ink">
            {vendorsNeedingAction}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-muted">
            Vendors needing action
          </div>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-4">
          <Eyebrow>Urgent across all weddings</Eyebrow>
        </div>
        {urgentItems.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-ink-muted">
            Nothing urgent right now — you&apos;re in good shape.
          </Card>
        ) : (
          <Card className="divide-y divide-stone">
            {urgentItems.map((item) => (
              <Link
                key={`${item.kind}-${item.id}`}
                href={urgentHref(item)}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-porcelain"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">
                    {urgentTitle(item)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted">
                    {item.projectName}
                    {item.kind === "task"
                      ? ` · due ${formatWeddingDate(item.dueDate)}`
                      : null}
                  </div>
                </div>
                <Pill variant={urgentVariant(item)}>{urgentLabel(item)}</Pill>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4">
          <Eyebrow>All weddings</Eyebrow>
        </div>
        {projects.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-ink-muted">
            No weddings yet. Create your first client wedding to get started.
          </Card>
        ) : (
          <Card className="divide-y divide-stone">
            {projects.map((project) => {
              const days = daysUntil(project.wedding_date);
              const active = project.status === "active";

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-porcelain"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{project.name}</div>
                    <div className="mt-0.5 text-sm text-ink-muted tabnum">
                      {formatWeddingDate(project.wedding_date)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {days !== null ? (
                      <span className="text-sm text-ink-muted tabnum">{days}d</span>
                    ) : null}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        active ? "text-plum" : "text-ink-muted",
                      )}
                    >
                      {active ? "Active" : project.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
