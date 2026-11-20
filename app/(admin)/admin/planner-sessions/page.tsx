import {
  completeSession,
  scheduleSession,
  setSessionStatus,
} from "@/app/(admin)/admin/planner-sessions/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { SESSION_MINUTES } from "@/lib/planner-sessions/catalog";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/** Admins schedule in Arizona time (UTC-7, no DST). */
const PHOENIX_OFFSET_MINUTES = 420;

const STATUS: Record<string, { label: string; variant: PillVariant }> = {
  requested: { label: "Needs scheduling", variant: "clay" },
  scheduled: { label: "Scheduled", variant: "accent" },
  completed: { label: "Done", variant: "sage" },
  no_show: { label: "No-show", variant: "rosewood" },
  canceled: { label: "Canceled", variant: "default" },
};

type Row = {
  id: string;
  account_id: string;
  requested_by: string | null;
  session_kind: "quick" | "full";
  status: string;
  question: string;
  preferred_times: string | null;
  scheduled_at: string | null;
  meeting_url: string | null;
  recap: string | null;
  created_at: string;
};

function phoenix(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  });
}

function countWithinWeek(rows: Row[]) {
  const weekAhead = Date.now() + 7 * 86_400_000;
  return rows.filter(
    (r) => r.scheduled_at && new Date(r.scheduled_at).getTime() < weekAhead,
  ).length;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - PHOENIX_OFFSET_MINUTES * 60_000);
  return d.toISOString().slice(0, 16);
}

export default async function AdminPlannerSessionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planner_sessions")
    .select(
      "id, account_id, requested_by, session_kind, status, question, preferred_times, scheduled_at, meeting_url, recap, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  const admin = createServiceRoleClient();
  const emails = new Map<string, string>();
  await Promise.all(
    [...new Set(rows.map((r) => r.requested_by).filter(Boolean))].map(
      async (uid) => {
        const { data: u } = await admin.auth.admin.getUserById(uid as string);
        if (u.user?.email) emails.set(uid as string, u.user.email);
      },
    ),
  );

  const open = rows.filter((r) => r.status === "requested" || r.status === "scheduled");
  const closed = rows.filter((r) => !open.includes(r));
  open.sort((a, b) => {
    if (a.status !== b.status) return a.status === "requested" ? -1 : 1;
    return (a.scheduled_at ?? a.created_at).localeCompare(b.scheduled_at ?? b.created_at);
  });

  const bookedThisWeek = countWithinWeek(open);

  return (
    <div>
      <PageHeader
        className="mb-4"
        title="Planner sessions"
        description={`${open.filter((r) => r.status === "requested").length} waiting to be scheduled · ${bookedThisWeek} on the calendar in the next 7 days. Times are Arizona time.`}
      />

      <div className="space-y-4">
        {open.length === 0 ? (
          <Card className="p-6">
            <p className="text-[14px] text-muted">No open requests.</p>
          </Card>
        ) : null}
        {open.map((r) => (
          <SessionCard key={r.id} row={r} email={emails.get(r.requested_by ?? "")} />
        ))}
      </div>

      {closed.length > 0 ? (
        <>
          <h2 className="mt-10 mb-3 text-[15px] font-medium text-ink">History</h2>
          <div className="space-y-3">
            {closed.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <Pill variant={STATUS[r.status]?.variant ?? "default"}>
                    {STATUS[r.status]?.label ?? r.status}
                  </Pill>
                  <span>{emails.get(r.requested_by ?? "") ?? "Unknown"}</span>
                  <span>· {SESSION_MINUTES[r.session_kind]} min</span>
                  {r.scheduled_at ? <span>· {phoenix(r.scheduled_at)}</span> : null}
                </div>
                <p className="mt-2 text-[14px] text-ink">{r.question}</p>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SessionCard({ row: r, email }: { row: Row; email?: string }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Pill variant={STATUS[r.status]?.variant ?? "default"}>
          {STATUS[r.status]?.label}
        </Pill>
        <span className="text-[14px] font-semibold text-ink">{email ?? "Unknown couple"}</span>
        <span className="text-[13px] text-muted">
          · {SESSION_MINUTES[r.session_kind]} min · requested {phoenix(r.created_at)}
        </span>
      </div>
      <p className="mt-3 text-[15px] whitespace-pre-wrap text-ink">{r.question}</p>
      {r.preferred_times ? (
        <p className="mt-2 text-[13px] text-muted">Prefers: {r.preferred_times}</p>
      ) : null}

      <form
        action={scheduleSession}
        className="mt-5 grid gap-3 border-t border-hairline pt-4 md:grid-cols-[200px_1fr_auto] md:items-end"
      >
        <input type="hidden" name="id" value={r.id} />
        <input type="hidden" name="tz_offset" value={PHOENIX_OFFSET_MINUTES} />
        <label className="block text-[13px] font-medium text-ink">
          Date &amp; time
          <Input
            type="datetime-local"
            name="scheduled_at"
            required
            defaultValue={toLocalInput(r.scheduled_at)}
            className="mt-1"
          />
        </label>
        <label className="block text-[13px] font-medium text-ink">
          Zoom link
          <Input
            type="url"
            name="meeting_url"
            placeholder="https://zoom.us/j/…"
            defaultValue={r.meeting_url ?? ""}
            className="mt-1"
          />
        </label>
        <Button type="submit" variant="default">
          {r.status === "scheduled" ? "Update & email" : "Schedule & email"}
        </Button>
      </form>

      {r.status === "scheduled" ? (
        <form action={completeSession} className="mt-4 space-y-2">
          <input type="hidden" name="id" value={r.id} />
          <label className="block text-[13px] font-medium text-ink">
            Recap (emailed to the couple)
            <Textarea name="recap" rows={4} className="mt-1" defaultValue={r.recap ?? ""} />
          </label>
          <Button type="submit">Mark done</Button>
        </form>
      ) : null}

      <div className="mt-4 flex gap-4">
        {r.status === "scheduled" ? (
          <form action={setSessionStatus}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value="no_show" />
            <button type="submit" className="text-[13px] font-medium text-muted hover:text-rosewood">
              Mark no-show
            </button>
          </form>
        ) : null}
        <form action={setSessionStatus}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="canceled" />
          <button type="submit" className="text-[13px] font-medium text-muted hover:text-rosewood">
            Cancel &amp; return credit
          </button>
        </form>
      </div>
    </Card>
  );
}
