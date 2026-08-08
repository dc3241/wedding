import { SlimHero } from "@/components/ui";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
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
      <div className="flex items-stretch gap-3">
        <SlimHero
          coupleNames={overview.coupleNames}
          weddingDate={overview.weddingDate}
          projectId={overview.projectId}
          showCountdown={false}
          className="mb-0 min-w-0 flex-1"
        />
        <TourHelpButton className="self-center" />
      </div>
      <ProjectOverview
        data={overview}
        showLastContact={false}
        isPersonalOwner={isPersonalOwner}
      />
    </div>
  );
}
