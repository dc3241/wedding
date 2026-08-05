import { SlimHero } from "@/components/ui";
import { ProjectOverview } from "@/components/dashboard/project-overview";
import type { OverviewData } from "@/components/dashboard/overview-data";

type CoupleDashboardProps = {
  overview: OverviewData;
};

export function CoupleDashboard({ overview }: CoupleDashboardProps) {
  return (
    <div className="space-y-4">
      <SlimHero
        coupleNames={overview.coupleNames}
        weddingDate={overview.weddingDate}
        projectId={overview.projectId}
        showCountdown={false}
        className="mb-0"
      />
      <ProjectOverview data={overview} showLastContact={false} />
    </div>
  );
}
