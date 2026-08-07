import { SlimHero } from "@/components/ui";
import { ProjectOverview } from "@/components/dashboard/project-overview";
import type { OverviewData } from "@/components/dashboard/overview-data";

type CoupleDashboardProps = {
  overview: OverviewData;
  /** Personal account owner — excludes invited collaborators (no account). */
  isPersonalOwner?: boolean;
};

export function CoupleDashboard({
  overview,
  isPersonalOwner = false,
}: CoupleDashboardProps) {
  return (
    <div className="space-y-4">
      <SlimHero
        coupleNames={overview.coupleNames}
        weddingDate={overview.weddingDate}
        projectId={overview.projectId}
        showCountdown={false}
        className="mb-0"
      />
      <ProjectOverview
        data={overview}
        showLastContact={false}
        isPersonalOwner={isPersonalOwner}
      />
    </div>
  );
}
