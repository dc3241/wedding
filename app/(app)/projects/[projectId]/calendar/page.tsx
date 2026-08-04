import { notFound } from "next/navigation";
import {
  monthGridWindow,
  parseYearMonth,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import type {
  ActiveWedding,
  CalendarEventRow,
  EventKind,
  PaymentDueOverlay,
  TaskDueOverlay,
} from "@/app/(app)/calendar/types";
import { isEventKind } from "@/app/(app)/calendar/types";
import { PageHeader } from "@/components/ui/page-header";
import { deriveScheduleWaterfall } from "@/lib/budget-aggregates";
import { createClient } from "@/utils/supabase/server";
import { ProjectCalendarWorkspace } from "./ProjectCalendarWorkspace";

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

export default async function ProjectCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: SearchParams;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, wedding_date")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const wedding: ActiveWedding = {
    id: project.id,
    name: project.name,
    wedding_date: project.wedding_date,
  };

  const query = await searchParams;
  const { year, month } = parseYearMonth(query.ym, new Date());
  const { rangeStart, rangeEnd } = monthGridWindow(year, month);

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const upcomingEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 6,
  );
  const upcomingEndKey = toLocalDateKey(upcomingEnd);
  const queryStart =
    `${todayKey}T00:00:00.000Z` < rangeStart
      ? `${todayKey}T00:00:00.000Z`
      : rangeStart;
  const queryEnd =
    `${upcomingEndKey}T23:59:59.999Z` > rangeEnd
      ? `${upcomingEndKey}T23:59:59.999Z`
      : rangeEnd;

  const paddedStart = shiftIsoDate(queryStart.slice(0, 10), -1);
  const paddedEnd = shiftIsoDate(queryEnd.slice(0, 10), 1);

  const [
    { data: eventRows },
    { data: budgetItemRows },
    { data: scheduleRows },
    { data: paymentRows },
    { data: taskRows },
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, account_id, project_id, title, event_kind, starts_at, ends_at, all_day, location, notes",
      )
      .eq("project_id", projectId)
      .gte("starts_at", `${paddedStart}T00:00:00.000Z`)
      .lte("starts_at", `${paddedEnd}T23:59:59.999Z`)
      .order("starts_at", { ascending: true }),
    supabase
      .from("budget_items")
      .select("id, project_id, category, label")
      .eq("project_id", projectId),
    supabase
      .from("payment_schedule")
      .select("id, project_id, budget_item_id, amount, due_on, label")
      .eq("project_id", projectId)
      .order("due_on", { ascending: true }),
    supabase
      .from("budget_payments")
      .select("id, budget_item_id, amount")
      .eq("project_id", projectId),
    supabase
      .from("tasks")
      .select("id, project_id, title, due_date, status")
      .eq("project_id", projectId)
      .neq("status", "done")
      .not("due_date", "is", null),
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

  const payments: PaymentDueOverlay[] = [];
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
    for (const row of schedule) {
      if (row.covered) continue;
      payments.push({
        installmentId: row.id,
        projectId,
        projectName: wedding.name,
        budgetItemId: itemId,
        label: installmentDisplayLabel(row.label, itemLabel),
        amount: row.amount,
        due_on: row.due_on,
        pastDue: row.due_on < todayKey,
      });
    }
  }

  const tasks: TaskDueOverlay[] = (taskRows ?? []).flatMap((row) => {
    const due = row.due_date as string | null;
    if (!due) return [];
    return [
      {
        taskId: row.id as string,
        projectId,
        projectName: wedding.name,
        title: (row.title as string).trim() || "Task",
        due_date: due,
        pastDue: due < todayKey,
      },
    ];
  });

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Schedule"
          title="Calendar"
          description="Appointments, payment dues, and task dues for your wedding."
        />
      </div>
      <ProjectCalendarWorkspace
        projectId={projectId}
        year={year}
        month={month}
        events={events}
        wedding={wedding}
        payments={payments}
        tasks={tasks}
      />
    </div>
  );
}
