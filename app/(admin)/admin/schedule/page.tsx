import { ScheduleGrid } from "@/components/admin/schedule-grid";
import { PageHeader } from "@/components/ui/page-header";
import { getScheduleWeeks, pickCurrentWeek } from "@/lib/admin/queries";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const weeks = await getScheduleWeeks(supabase);
  const currentWeek = pickCurrentWeek(weeks, adminToday());

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Schedule"
        description="Weekly content calendar — pick a month and week, tap a box to mark it created & posted, and log performance at the bottom of each week."
      />

      <ScheduleGrid weeks={weeks} initialWeekId={currentWeek?.id ?? null} />
    </div>
  );
}
