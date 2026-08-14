import { redirect } from "next/navigation";
import { CalendarWorkspace } from "./CalendarWorkspace";
import {
  monthGridWindow,
  parseYearMonth,
  toLocalDateKey,
} from "./calendar-source";
import type {
  ActiveWedding,
  CalendarEventRow,
  EventKind,
  PaymentDueOverlay,
  TaskDueOverlay,
} from "./types";
import { isEventKind } from "./types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { deriveScheduleWaterfall } from "@/lib/budget-aggregates";
import { isTaskPastDue } from "@/lib/task-overdue";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Promise<{ ym?: string }>;

function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function budgetItemLabel(row: {
  category: string | null;
  label: string | null;
}): string {
  const label = row.label?.trim() ?? "";
  if (label) return label;
  const category = row.category?.trim() ?? "";
  return category !== "" ? category : "Budget item";
}

function installmentDisplayLabel(
  installmentLabel: string | null,
  itemLabel: string,
): string {
  const part = installmentLabel?.trim();
  if (part) return `${part} · ${itemLabel}`;
  return itemLabel;
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
  const todayKey = toLocalDateKey(now);
  const upcomingEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
  const upcomingEndKey = toLocalDateKey(upcomingEnd);
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

  const activeProjectIds = weddings.map((w) => w.id);
  const projectNameById = new Map(weddings.map((w) => [w.id, w.name]));

  let payments: PaymentDueOverlay[] = [];
  let tasks: TaskDueOverlay[] = [];

  if (activeProjectIds.length > 0) {
    const [
      { data: budgetItemRows },
      { data: scheduleRows },
      { data: paymentRows },
      { data: taskRows },
    ] = await Promise.all([
      supabase
        .from("budget_items")
        .select("id, project_id, category, label")
        .in("project_id", activeProjectIds),
      supabase
        .from("payment_schedule")
        .select("id, project_id, budget_item_id, amount, due_on, label")
        .in("project_id", activeProjectIds)
        .order("due_on", { ascending: true }),
      supabase
        .from("budget_payments")
        .select("id, budget_item_id, amount")
        .in("project_id", activeProjectIds),
      supabase
        .from("tasks")
        .select("id, project_id, title, due_date, status")
        .in("project_id", activeProjectIds)
        .neq("status", "done")
        .not("due_date", "is", null),
    ]);

    const itemById = new Map(
      (budgetItemRows ?? []).map((row) => [
        row.id,
        {
          id: row.id,
          project_id: row.project_id as string,
          category: row.category as string | null,
          label: row.label as string | null,
        },
      ]),
    );

    const paidByItem = new Map<string, number>();
    for (const row of paymentRows ?? []) {
      const prev = paidByItem.get(row.budget_item_id) ?? 0;
      paidByItem.set(row.budget_item_id, prev + Number(row.amount));
    }

    const scheduleByItem = new Map<
      string,
      {
        id: string;
        budget_item_id: string;
        amount: number;
        due_on: string;
        label: string | null;
        project_id: string;
      }[]
    >();
    for (const row of scheduleRows ?? []) {
      const list = scheduleByItem.get(row.budget_item_id) ?? [];
      list.push({
        id: row.id,
        budget_item_id: row.budget_item_id,
        amount: Number(row.amount),
        due_on: row.due_on,
        label: row.label ?? null,
        project_id: row.project_id as string,
      });
      scheduleByItem.set(row.budget_item_id, list);
    }

    const paymentOverlays: PaymentDueOverlay[] = [];
    for (const [itemId, installments] of scheduleByItem) {
      const item = itemById.get(itemId);
      if (!item) continue;
      const paid = paidByItem.get(itemId) ?? 0;
      const { schedule } = deriveScheduleWaterfall(
        installments,
        paid,
        todayKey,
      );
      const itemLabel = budgetItemLabel(item);
      const projectName = projectNameById.get(item.project_id) ?? "Wedding";
      for (const row of schedule) {
        if (row.covered) continue;
        paymentOverlays.push({
          installmentId: row.id,
          projectId: item.project_id,
          projectName,
          budgetItemId: itemId,
          label: installmentDisplayLabel(row.label, itemLabel),
          amount: row.amount,
          due_on: row.due_on,
          pastDue: row.due_on < todayKey,
        });
      }
    }
    payments = paymentOverlays;

    tasks = (taskRows ?? []).flatMap((row) => {
      const due = row.due_date as string | null;
      if (!due) return [];
      const projectId = row.project_id as string;
      return [
        {
          taskId: row.id as string,
          projectId,
          projectName: projectNameById.get(projectId) ?? "Wedding",
          title: (row.title as string).trim() || "Task",
          due_date: due,
          pastDue: isTaskPastDue(due, row.status as string, now),
        },
      ];
    });
  }

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
        payments={payments}
        tasks={tasks}
      />
    </div>
  );
}
