import { AdminScheduleChip } from "@/components/admin/admin-schedule-chip";
import { PillarGrid } from "@/components/admin/pillar-grid";
import { PageHeader } from "@/components/ui/page-header";
import { COUPLES_CONTENT_PILLARS } from "@/lib/admin/content-pillars";

export default function CouplesPillarsPage() {
  return (
    <div>
      <PageHeader
        className="mb-4"
        title="Content pillars — Couples"
        description="Reference list for picking what to make next — not a generator."
      />
      <div className="mb-4">
        <AdminScheduleChip>
          Seasonal overlay: Nov–Feb leans timeline/checklist (just-engaged);
          spring–summer leans mistakes & vendor-coordination
        </AdminScheduleChip>
      </div>
      <PillarGrid pillars={COUPLES_CONTENT_PILLARS} />
    </div>
  );
}
