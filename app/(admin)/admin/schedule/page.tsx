import { ScheduleGrid } from "@/components/admin/schedule-grid";
import { getScheduleWeeks, pickCurrentWeek } from "@/lib/admin/queries";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const weeks = await getScheduleWeeks(supabase);
  const currentWeek = pickCurrentWeek(weeks, adminToday());

  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Schedule
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        Weekly content calendar — tap a box to mark it created &amp; posted, click a week to
        switch, and log performance at the bottom of each week.
      </p>

      <ScheduleGrid weeks={weeks} initialWeekId={currentWeek?.id ?? null} />
    </div>
  );
}
