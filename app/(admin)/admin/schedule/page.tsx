import { ContentWeekSchedule } from "@/components/admin/content-week-schedule";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatWeekRange,
  parseWeekStart,
  postingDates,
} from "@/lib/admin/content-week";
import {
  ensureWeekSlots,
  listContentWeekStarts,
  loadContentWeek,
} from "@/lib/admin/content-week/load";
import { getScheduleWeeks, pickCurrentWeek } from "@/lib/admin/queries";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const today = adminToday();
  const { week } = await searchParams;
  const weekStart = parseWeekStart(week, today);
  await ensureWeekSlots(supabase, weekStart);

  const [board, weeks, scheduleWeeks] = await Promise.all([
    loadContentWeek(supabase, weekStart),
    listContentWeekStarts(supabase),
    getScheduleWeeks(supabase),
  ]);

  const perfWeek = pickCurrentWeek(scheduleWeeks, weekStart);
  const performance = perfWeek
    ? {
        weekId: perfWeek.id,
        views: perfWeek.performance?.views ?? null,
        follower_growth: perfWeek.performance?.follower_growth ?? null,
        dms: perfWeek.performance?.dms ?? null,
        signups: perfWeek.performance?.signups ?? null,
        notes: perfWeek.performance?.notes ?? null,
      }
    : null;

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Schedule"
        description={`${formatWeekRange(weekStart)}. TikTok videos rotate through the app, one tab at a time. Check a video off once it is filmed and posted.`}
      />

      <ContentWeekSchedule
        weekStart={weekStart}
        weeks={weeks}
        dates={postingDates(weekStart)}
        today={today}
        slots={board.slots}
        ideas={board.ideas}
        drafts={board.drafts}
        performance={performance}
      />
    </div>
  );
}
