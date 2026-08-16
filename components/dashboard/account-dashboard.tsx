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
  WeddingCardModel,
} from "@/lib/dashboard-aggregates";
import type { AccountPlan } from "@/lib/account-context";
import { getCopy } from "@/lib/venue-copy";

type AccountDashboardProps = {
  activeProjects: PlannerProjectSummary[];
  archivedProjects: PlannerProjectSummary[];
  activeWeddingCards: WeddingCardModel[];
  activeWeddings: number;
  tasksDueThisWeek: number;
  vendorsNeedingAction: number;
  urgentItems: UrgentItem[];
  plan?: AccountPlan;
};

export function AccountDashboard({
  activeProjects,
  archivedProjects,
  activeWeddingCards,
  activeWeddings,
  tasksDueThisWeek,
  vendorsNeedingAction,
  urgentItems,
  plan = "planner",
}: AccountDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Planning"
          title="Dashboard"
          description={getCopy("dashboardDescription", plan)}
        />
        <NewWeddingForm templateSources={activeProjects} plan={plan} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <StatCard
          value={activeWeddings}
          label={getCopy("activeProjectsStat", plan)}
        />
        <StatCard value={tasksDueThisWeek} label="Tasks due this week" />
        <StatCard value={vendorsNeedingAction} label="Vendors needing action" />
      </div>

      <section className="mb-8">
        <SectionHeader>{getCopy("urgentSection", plan)}</SectionHeader>
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
        activeWeddingCards={activeWeddingCards}
        archivedProjects={archivedProjects}
        plan={plan}
      />
    </div>
  );
}
