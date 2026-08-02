import { DashboardWeddingList } from "@/components/dashboard/dashboard-wedding-list";
import { UrgentByWedding } from "@/components/dashboard/urgent-by-wedding";
import { NewWeddingForm } from "@/components/projects/new-wedding-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import type {
  PlannerProjectSummary,
  UrgentItem,
} from "@/lib/dashboard-aggregates";

type AccountDashboardProps = {
  activeProjects: PlannerProjectSummary[];
  archivedProjects: PlannerProjectSummary[];
  activeWeddings: number;
  tasksDueThisWeek: number;
  vendorsNeedingAction: number;
  urgentItems: UrgentItem[];
};

export function AccountDashboard({
  activeProjects,
  archivedProjects,
  activeWeddings,
  tasksDueThisWeek,
  vendorsNeedingAction,
  urgentItems,
}: AccountDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-8 flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Planning"
          title="Dashboard"
          description="Your weddings at a glance."
        />
        <NewWeddingForm />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <StatCard value={activeWeddings} label="Active weddings" />
        <StatCard value={tasksDueThisWeek} label="Tasks due this week" />
        <StatCard value={vendorsNeedingAction} label="Vendors needing action" />
      </div>

      <section className="mb-8">
        <SectionHeader>Urgent across all weddings</SectionHeader>
        {urgentItems.length === 0 ? (
          <EmptyState>
            Nothing urgent right now — you&apos;re in good shape.
          </EmptyState>
        ) : (
          <UrgentByWedding
            urgentItems={urgentItems}
            activeProjects={activeProjects}
          />
        )}
      </section>

      <DashboardWeddingList
        activeProjects={activeProjects}
        archivedProjects={archivedProjects}
      />
    </div>
  );
}
