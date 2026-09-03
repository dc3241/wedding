import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAutomationPrompts,
  getContentBank,
  getScheduleWeeks,
  pickCurrentWeek,
} from "@/lib/admin/queries";
import { SCHEDULE_PLATFORM_COLS } from "@/lib/admin/platforms";
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

  const [weeks, bank, prompts] = await Promise.all([
    getScheduleWeeks(supabase),
    getContentBank(supabase),
    getAutomationPrompts(supabase),
  ]);

  const currentWeek = pickCurrentWeek(weeks, today);
  const todayRow = currentWeek?.days.find((d) => d.date === today) ?? null;

  const activeCols = SCHEDULE_PLATFORM_COLS.filter(
    (c) => todayRow && todayRow.platforms[c.key] !== "off",
  );
  const doneCols = activeCols.filter((c) => todayRow!.platforms[c.key] === "done");

  // Most recent week with a logged performance row.
  const latestPerf = [...weeks]
    .reverse()
    .map((w) => w.performance)
    .find((p) => p && (p.views || p.dms || p.signups || p.follower_growth));

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Overview"
        description={currentWeek ? currentWeek.label : "No schedule week set up yet"}
      />

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <AdminStat
          label="Today's checklist"
          value={todayRow ? `${doneCols.length}/${activeCols.length}` : "—"}
          sub="posted so far"
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
          sub="across 6 platforms"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr] md:items-start">
        <Card className="px-6 py-5">
          <Eyebrow className="mb-3 text-accent">
            Today — {todayRow?.date ?? today}
          </Eyebrow>
          {todayRow ? (
            <div>
              {SCHEDULE_PLATFORM_COLS.filter((c) => todayRow.platforms[c.key] !== "off").map(
                (c) => {
                  const status = todayRow.platforms[c.key] ?? "pending";
                  return (
                    <div
                      key={c.key}
                      className="flex items-center justify-between border-b border-hairline py-2.5 text-[15px] font-medium last:border-b-0"
                    >
                      <span>{c.label}</span>
                      <span
                        className={
                          status === "done"
                            ? "font-semibold text-sage"
                            : "text-muted"
                        }
                      >
                        {status === "done" ? "Posted" : "Pending"}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyState>No schedule set up for today yet.</EmptyState>
          )}
        </Card>

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
            <Eyebrow className="mb-3 text-accent">Automations</Eyebrow>
            <p className="text-[15px] font-medium text-muted">
              {prompts.length} prompt{prompts.length === 1 ? "" : "s"} ready to run —
              weekly content-day batch normally runs Fridays.
            </p>
            <ButtonLink href="/admin/automations" variant="primary" className="mt-4">
              Open automations
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
