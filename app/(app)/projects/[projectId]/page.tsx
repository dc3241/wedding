import { notFound } from "next/navigation";
import {
  buildCalendarItems,
  toLocalDateKey,
  upcomingItems,
} from "@/app/(app)/calendar/calendar-source";
import type {
  ActiveWedding,
  CalendarEventRow,
  EventKind,
  PaymentDueOverlay,
  TaskDueOverlay,
} from "@/app/(app)/calendar/types";
import { isEventKind } from "@/app/(app)/calendar/types";
import {
  CoupleDashboard,
  type ComingUpItem,
} from "@/components/dashboard/couple-dashboard";
import {
  PlannerDashboard,
  buildLastContactMap,
  computeBudgetCommittedPercent,
  countTasksDueThisWeek,
} from "@/components/dashboard/planner-dashboard";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import {
  sumPartySize,
  sumPartySizeByStatus,
  type Guest,
} from "./guests/types";
import { getAccountContext } from "@/lib/account-context";
import { deriveScheduleWaterfall } from "@/lib/budget-aggregates";
import { createClient } from "@/utils/supabase/server";

type TaskSummary = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  phase: string | null;
  position: number;
};

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

function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  const isPlanner = account?.kind === "business";

  const [
    { data: project },
    { data: tasks },
    { data: vendorRows },
    { data: budgetItemRows },
    { data: paymentRows },
    { data: guestRows },
    { data: websiteRow },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, wedding_date, total_budget")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, phase, position")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("project_vendors")
      .select(
        "id, status, quoted_price, vendors(id, name, category, contact_email, website, ai_overview, last_enriched_at)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("budget_items")
      .select(
        "id, category, label, planned_amount, actual_amount, due_date, notes, project_vendor_id",
      )
      .eq("project_id", projectId)
      .order("category", { ascending: true, nullsFirst: false })
      .order("label", { ascending: true }),
    supabase
      .from("budget_payments")
      .select("id, budget_item_id, amount, paid_on, note")
      .eq("project_id", projectId),
    supabase
      .from("guests")
      .select("id, party_size, rsvp_status")
      .eq("project_id", projectId),
    supabase
      .from("wedding_websites")
      .select("id, published")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project) {
    notFound();
  }

  const vendors: OutreachVendor[] = (vendorRows ?? [])
    .map((row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      if (!vendor) return null;
      return {
        id: row.id,
        status: row.status as OutreachVendor["status"],
        quoted_price:
          row.quoted_price === null || row.quoted_price === undefined
            ? null
            : Number(row.quoted_price),
        vendor,
      };
    })
    .filter((item): item is OutreachVendor => item !== null);

  if (isPlanner) {
    const vendorIds = vendors.map((vendor) => vendor.id);
    const { data: messageRows } =
      vendorIds.length > 0
        ? await supabase
            .from("outreach_messages")
            .select("project_vendor_id, sent_at, updated_at")
            .in("project_vendor_id", vendorIds)
        : { data: [] };

    const lastContactByVendor = buildLastContactMap(messageRows ?? []);
    const taskList = (tasks ?? []) as TaskSummary[];
    const vendorsBooked = vendors.filter((v) => v.status === "booked").length;

    return (
      <PlannerDashboard
        projectId={projectId}
        tasksDueThisWeek={countTasksDueThisWeek(taskList)}
        vendorsBooked={vendorsBooked}
        vendorsTotal={vendors.length}
        budgetCommittedPercent={computeBudgetCommittedPercent(vendors)}
        vendors={vendors.map((vendor) => ({
          ...vendor,
          lastContact: lastContactByVendor.get(vendor.id) ?? null,
        }))}
      />
    );
  }

  const totalBudget =
    project.total_budget === null || project.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const budgetItems = (budgetItemRows ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    label: row.label,
    planned_amount: Number(row.planned_amount),
    actual_amount:
      row.actual_amount === null || row.actual_amount === undefined
        ? null
        : Number(row.actual_amount),
    due_date: row.due_date ?? null,
    notes: row.notes,
    project_vendor_id: row.project_vendor_id ?? null,
  }));

  const budgetPayments = (paymentRows ?? []).map((row) => ({
    id: row.id,
    budget_item_id: row.budget_item_id,
    amount: Number(row.amount),
    paid_on: row.paid_on ?? null,
    note: row.note ?? null,
  }));

  const guests = (guestRows ?? []) as Pick<
    Guest,
    "id" | "party_size" | "rsvp_status"
  >[];

  const guestStats = {
    invited: sumPartySize(guests as Guest[]),
    attending: sumPartySizeByStatus(guests as Guest[], "attending"),
    declined: sumPartySizeByStatus(guests as Guest[], "declined"),
    pending: sumPartySizeByStatus(guests as Guest[], "pending"),
    householdCount: guests.length,
  };

  const website = websiteRow
    ? { published: Boolean(websiteRow.published) }
    : null;

  const todayKey = toLocalDateKey(new Date());
  const upcomingEnd = shiftIsoDate(todayKey, 6);
  const paddedStart = shiftIsoDate(todayKey, -1);
  const paddedEnd = shiftIsoDate(upcomingEnd, 1);

  const [{ data: eventRows }, { data: scheduleRows }] = await Promise.all([
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
      .from("payment_schedule")
      .select("id, project_id, budget_item_id, amount, due_on, label")
      .eq("project_id", projectId)
      .order("due_on", { ascending: true }),
  ]);

  const wedding: ActiveWedding = {
    id: project.id,
    name: project.name,
    wedding_date: project.wedding_date,
  };

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

  const taskOverlays: TaskDueOverlay[] = ((tasks ?? []) as TaskSummary[])
    .filter((task) => task.status !== "done" && task.due_date)
    .map((task) => ({
      taskId: task.id,
      projectId,
      projectName: wedding.name,
      title: task.title.trim() || "Task",
      due_date: task.due_date!,
      pastDue: task.due_date! < todayKey,
    }));

  const calendarItems = buildCalendarItems(
    events,
    [wedding],
    payments,
    taskOverlays,
  );
  const upcoming = upcomingItems(calendarItems, todayKey, 7);
  const overdue = calendarItems.filter(
    (item) =>
      Boolean(item.pastDue) &&
      (item.source === "payment" || item.source === "task"),
  );
  const seen = new Set<string>();
  const comingUp: ComingUpItem[] = [];
  for (const item of [...overdue, ...upcoming]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    comingUp.push({
      id: item.id,
      source: item.source,
      title: item.title,
      localDate: item.localDate,
      timeLabel: item.timeLabel,
      pastDue: item.pastDue,
      amount: item.amount,
      href:
        item.source === "authored"
          ? `/projects/${projectId}/calendar`
          : (item.href ?? `/projects/${projectId}/calendar`),
    });
  }

  return (
    <CoupleDashboard
      projectId={projectId}
      coupleNames={project.name}
      weddingDate={project.wedding_date}
      tasks={(tasks ?? []) as TaskSummary[]}
      vendors={vendors}
      totalBudget={totalBudget}
      budgetItems={budgetItems}
      budgetPayments={budgetPayments}
      guestStats={guestStats}
      website={website}
      comingUp={comingUp}
    />
  );
}
