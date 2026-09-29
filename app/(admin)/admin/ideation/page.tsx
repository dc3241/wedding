import { ContentWeekIdeas } from "@/components/admin/content-week-ideas";
import { IdeationBoard } from "@/components/admin/ideation-board";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatWeekRange,
  parseWeekStart,
  postingDates,
} from "@/lib/admin/content-week";
import { ensureWeekSlots, loadContentWeek, listContentWeekStarts } from "@/lib/admin/content-week/load";
import { getIdeationItems } from "@/lib/admin/queries";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const today = adminToday();
  const { week } = await searchParams;
  const weekStart = parseWeekStart(week, today);
  await ensureWeekSlots(supabase, weekStart);

  const [board, weeks, legacy] = await Promise.all([
    loadContentWeek(supabase, weekStart),
    listContentWeekStarts(supabase),
    getIdeationItems(supabase),
  ]);

  const earlier = legacy.filter((item) => !item.slot_date);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Ideation"
        description={`Monday–Saturday of ${formatWeekRange(weekStart)}. Choose ideas, then produce them. Sunday morning fills the week; Generate does it on demand.`}
      />

      <ContentWeekIdeas
        weekStart={weekStart}
        weeks={weeks}
        dates={postingDates(weekStart)}
        today={today}
        ideas={board.ideas}
        slots={board.slots}
        drafts={board.drafts}
      />

      {earlier.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Earlier ideas
          </h2>
          <IdeationBoard items={earlier} />
        </div>
      ) : null}
    </div>
  );
}
