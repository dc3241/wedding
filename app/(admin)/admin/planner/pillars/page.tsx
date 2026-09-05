import { PillarGrid } from "@/components/admin/pillar-grid";
import { PageHeader } from "@/components/ui/page-header";
import { PLANNER_CONTENT_PILLARS } from "@/lib/admin/content-pillars";

export default function PlannerPillarsPage() {
  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Content pillars — Venues & planners"
        description="Pillar bank for LinkedIn, Reddit, and YouTube"
      />
      <PillarGrid pillars={PLANNER_CONTENT_PILLARS} />
    </div>
  );
}
