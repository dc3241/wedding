import { OutreachBoard } from "@/components/admin/outreach-board";
import { PageHeader } from "@/components/ui/page-header";
import { formatDayHeading, addDays } from "@/lib/admin/content-week";
import { parseOutreachDate } from "@/lib/admin/outreach";
import { ensureOutreachDay } from "@/lib/admin/outreach/load";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const maxDuration = 60;

export default async function PlannerOutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const today = adminToday();
  const { date: dateParam } = await searchParams;
  const date = parseOutreachDate(dateParam, today);
  const rows = await ensureOutreachDay(supabase, date);
  const sent = rows.filter((row) => row.sent_at).length;
  const heading = formatDayHeading(date);
  const when = date === today ? `Today, ${heading}` : heading;

  return (
    <div>
      <PageHeader
        className="mb-4"
        title="Venue outreach"
        description={`${when}. Five venues and five planners. Type a name or TikTok, generate the message, copy it, then mark it sent. ${sent}/10 sent.`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {parseOutreachDate(addDays(date, -1), today) === addDays(date, -1) ? (
          <DayLink date={addDays(date, -1)} label="Previous day" />
        ) : null}
        {date !== today ? <DayLink date={today} label="Today" /> : null}
        {parseOutreachDate(addDays(date, 1), today) === addDays(date, 1) ? (
          <DayLink date={addDays(date, 1)} label="Next day" />
        ) : null}
      </div>
      <OutreachBoard rows={rows} />
    </div>
  );
}

function DayLink({ date, label }: { date: string; label: string }) {
  return (
    <Link
      href={`/admin/planner/outreach?date=${date}`}
      className="inline-flex items-center rounded-[var(--radius-pill)] border-[1.5px] border-hairline bg-surface px-3.5 py-1.5 text-[14px] font-medium text-muted hover:border-accent hover:text-accent"
    >
      {label}
    </Link>
  );
}
