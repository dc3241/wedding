import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatWeekRange,
  postingDates,
  postingWeekMonday,
  slotLabel,
  videoFormatLine,
  videoSlotTitle,
} from "@/lib/admin/content-week";
import { ensureWeekSlots, loadContentWeek } from "@/lib/admin/content-week/load";
import { getContentBank, getScheduleWeeks } from "@/lib/admin/queries";
import { adminToday } from "@/lib/admin/today";
import { createClient } from "@/utils/supabase/server";

function AdminStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="mb-1.5 text-[14px] font-medium text-muted">{label}</div>
      <div className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {value}
      </div>
      {sub ? <div className="mt-1 text-[13px] text-muted">{sub}</div> : null}
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const today = adminToday();
  const weekStart = postingWeekMonday(today);
  await ensureWeekSlots(supabase, weekStart);

  const [weeks, bank, board] = await Promise.all([
    getScheduleWeeks(supabase),
    getContentBank(supabase),
    loadContentWeek(supabase, weekStart),
  ]);

  const postingToday = postingDates(weekStart).includes(today);
  const laneOrder = { video: 0, slideshow: 1, pin: 2, linkedin: 3 } as const;
  const todaySlots = (postingToday
    ? board.slots.filter((slot) => slot.slot_date === today)
    : []
  ).sort(
    (a, b) => laneOrder[a.lane] - laneOrder[b.lane] || a.position - b.position,
  );
  const postedSlots = todaySlots.filter((slot) => slot.posted_at);
  const ideasById = new Map(board.ideas.map((idea) => [idea.id, idea]));

  const latestPerf = [...weeks]
    .reverse()
    .map((w) => w.performance)
    .find((p) => p && (p.views || p.dms || p.signups || p.follower_growth));

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Overview"
        description={formatWeekRange(weekStart)}
      />

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <AdminStat
          label="Today's checklist"
          value={postingToday ? `${postedSlots.length}/${todaySlots.length}` : "Prep"}
          sub={postingToday ? "posted so far" : "Sunday content day"}
        />
        <AdminStat
          label="Last logged views"
          value={latestPerf?.views || "—"}
        />
        <AdminStat
          label="Last logged DMs"
          value={latestPerf?.dms || "—"}
          sub={latestPerf?.signups ? `${latestPerf.signups} sign-ups traced` : undefined}
        />
        <AdminStat
          label="Bank ideas ready"
          value={String(bank.length)}
          sub="in the bank"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr] md:items-start">
        <div className="flex flex-col gap-4">
          <Card className="px-6 py-5">
            <Eyebrow className="mb-3 text-accent">
              {postingToday ? "Today" : "Sunday — content day"}
            </Eyebrow>
            {postingToday && todaySlots.length > 0 ? (
              <div>
                {todaySlots.map((slot) => {
                  const idea = slot.idea_id ? ideasById.get(slot.idea_id) : undefined;
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 text-[15px] font-medium last:border-b-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] text-muted">
                          {slot.lane === "video"
                            ? videoSlotTitle(slot.position, slot.feature_key)
                            : slotLabel(slot.lane, slot.position, slot.intent)}
                        </span>
                        <span className="block truncate">
                          {slot.lane === "video"
                            ? videoFormatLine(slot.position, slot.feature_key)
                            : (idea?.idea_text ?? "Nothing chosen")}
                        </span>
                      </span>
                      <span
                        className={
                          slot.posted_at ? "shrink-0 font-semibold text-sage" : "shrink-0 text-muted"
                        }
                      >
                        {slot.posted_at
                          ? "Posted"
                          : slot.lane === "video" && slot.filmed_at
                            ? "Filmed"
                            : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState recessed>
                {postingToday
                  ? "Nothing on the schedule for today yet."
                  : "Slideshows, pins, and LinkedIn land here Sunday morning. Videos for the week are already on the schedule."}
              </EmptyState>
            )}
            <ButtonLink href="/admin/schedule" variant="default" className="mt-4">
              Open schedule
            </ButtonLink>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="px-6 py-5">
            <Eyebrow className="mb-3 text-accent">Latest performance</Eyebrow>
            {latestPerf ? (
              <div className="space-y-1.5 text-[15px] font-medium text-ink">
                <div>
                  <b>{latestPerf.views || "—"}</b> views
                </div>
                <div>
                  <b>{latestPerf.follower_growth || "—"}</b> follower growth
                </div>
                <div>
                  <b>{latestPerf.dms || "—"}</b> DMs · <b>{latestPerf.signups || "—"}</b>{" "}
                  sign-ups
                </div>
                {latestPerf.notes ? (
                  <p className="pt-1 text-muted italic">{latestPerf.notes}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-[15px] font-medium text-muted">Nothing logged yet.</p>
            )}
            <ButtonLink href="/admin/performance" variant="default" className="mt-4">
              View performance
            </ButtonLink>
          </Card>

          <Card className="px-6 py-5">
            <Eyebrow className="mb-3 text-accent">Content queue</Eyebrow>
            <p className="text-[15px] font-medium text-muted">
              Review pending graphics and captions. Approved items land in
              the content bank.
            </p>
            <ButtonLink href="/admin/content-queue" variant="primary" className="mt-4">
              Open content queue
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
