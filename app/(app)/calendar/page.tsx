import { redirect } from "next/navigation";
import { CalendarWorkspace } from "./CalendarWorkspace";
import {
  monthGridWindow,
  parseYearMonth,
} from "./calendar-source";
import type {
  ActiveWedding,
  CalendarEventRow,
  EventKind,
} from "./types";
import { isEventKind } from "./types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Promise<{ ym?: string }>;

function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "personal") {
    if (account.singleProjectId) {
      redirect(`/projects/${account.singleProjectId}`);
    }
    redirect("/projects");
  }

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    redirect("/projects");
  }

  const params = await searchParams;
  // Month from URL; "today" for default month is resolved client-side for
  // day cells — here we only need a stable server default for the query window.
  const { year, month } = parseYearMonth(params.ym, new Date());
  const { rangeStart, rangeEnd } = monthGridWindow(year, month);

  // Upcoming rail is always "next 7 days from today" — widen the query so
  // paging months does not drop near-term events from the rail.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
  const upcomingEndKey = `${upcomingEnd.getFullYear()}-${String(upcomingEnd.getMonth() + 1).padStart(2, "0")}-${String(upcomingEnd.getDate()).padStart(2, "0")}`;
  const queryStart =
    `${todayKey}T00:00:00.000Z` < rangeStart
      ? `${todayKey}T00:00:00.000Z`
      : rangeStart;
  const queryEnd =
    `${upcomingEndKey}T23:59:59.999Z` > rangeEnd
      ? `${upcomingEndKey}T23:59:59.999Z`
      : rangeEnd;

  // Pad one calendar day on each side so timed events near local midnight
  // still land in the fetched window across US timezones.
  const paddedStart = shiftIsoDate(queryStart.slice(0, 10), -1);
  const paddedEnd = shiftIsoDate(queryEnd.slice(0, 10), 1);

  const [{ data: eventRows }, { data: projectRows }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, account_id, project_id, title, event_kind, starts_at, ends_at, all_day, location, notes",
      )
      .eq("account_id", accountId)
      .gte("starts_at", `${paddedStart}T00:00:00.000Z`)
      .lte("starts_at", `${paddedEnd}T23:59:59.999Z`)
      .order("starts_at", { ascending: true }),
    supabase
      .from("projects")
      .select("id, name, wedding_date")
      .eq("account_id", accountId)
      .is("archived_at", null)
      .order("wedding_date", { ascending: true, nullsFirst: false }),
  ]);

  const events: CalendarEventRow[] = (eventRows ?? [])
    .filter((row) => isEventKind(row.event_kind))
    .map((row) => ({
      id: row.id,
      account_id: row.account_id,
      project_id: row.project_id,
      title: row.title,
      event_kind: row.event_kind as EventKind,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      all_day: row.all_day,
      location: row.location,
      notes: row.notes,
    }));

  const weddings: ActiveWedding[] = (projectRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    wedding_date: row.wedding_date,
  }));

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Schedule"
          title="Calendar"
          description="Meetings, visits, and deadlines across your active weddings."
        />
      </div>
      <CalendarWorkspace
        year={year}
        month={month}
        events={events}
        weddings={weddings}
      />
    </div>
  );
}
