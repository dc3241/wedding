import { toLocalDateKey } from "@/app/(app)/calendar/calendar-source";
import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import { countPeopleByHouseholdStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import {
  deriveScheduleWaterfall,
  type NextDueInstallment,
} from "@/lib/budget-aggregates";
import { deriveBookedVendorMoney } from "@/lib/booked-vendor-money";
import { isTaskPastDue } from "@/lib/task-overdue";

export type OverviewTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  phase: string | null;
  position: number;
};

export type OverviewBudgetItem = {
  id: string;
  category: string | null;
  label: string | null;
  planned_amount: number;
  actual_amount: number | null;
  due_date?: string | null;
  notes: string | null;
  project_vendor_id: string | null;
};

export type OverviewPayment = {
  id: string;
  budget_item_id: string;
  amount: number;
  paid_on: string | null;
  note: string | null;
};

export type OverviewScheduleRow = {
  id: string;
  budget_item_id: string;
  amount: number;
  due_on: string;
  label: string | null;
};

export type OverviewVendor = OutreachVendor & {
  lastContact?: string | null;
};

export type OverviewReadError = {
  tasks: boolean;
  budgetItems: boolean;
  payments: boolean;
  schedule: boolean;
  guests: boolean;
  vendors: boolean;
  project: boolean;
};

export type OverviewRsvp = {
  total: number;
  attending: number;
  declined: number;
  pending: number;
  responded: number;
};

export type OverviewNextPayment = {
  amount: number;
  due_on: string;
  /** Installment label — secondary breadcrumb only. */
  label: string | null;
  /** Human-meaningful headline (vendor → category → item label → floor). */
  primary: string;
  pastDue: boolean;
  moreThisQuarter: { count: number; total: number };
} | null;

export type OverviewAttentionItem = {
  id: string;
  title: string;
  detail: string;
  tone: "rosewood" | "clay";
};

export type OverviewPaidTone = "full" | "part" | "none" | "empty";

export type OverviewVendorRow = {
  vendor: OverviewVendor;
  paid: number | null;
  quote: number | null;
  paidTone: OverviewPaidTone;
  nextDue: NextDueInstallment | null;
  nextStep: string | null;
};

export type OverviewData = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  todayKey: string;
  totalBudget: number | null;
  paidTotal: number;
  checklist: { done: number; total: number; percent: number };
  rsvp: OverviewRsvp;
  nextPayment: OverviewNextPayment;
  /** True when schedule exists and every installment is covered. */
  allInstallmentsCovered: boolean;
  attention: OverviewAttentionItem[];
  vendorRows: OverviewVendorRow[];
  errors: OverviewReadError;
};

function daysUntil(dueDate: string, todayKey: string) {
  const today = new Date(todayKey + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function quarterBounds(todayKey: string): { start: string; end: string } {
  const [y, m] = todayKey.split("-").map(Number);
  const startMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = new Date(y, endMonth, 0).getDate();
  return {
    start: `${y}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${y}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`,
  };
}

function vendorNextStep(
  status: OutreachVendor["status"],
  nextDue: NextDueInstallment | null,
  quotedPrice: number | null,
): string | null {
  if (status === "to_contact") return "Send intro";
  if (status === "contacted") {
    return quotedPrice != null ? "Review quote" : "Follow up";
  }
  if (status === "replied") return "Review & book";
  if (status === "booked") {
    if (!nextDue) return null;
    const label = nextDue.label?.trim() ?? "";
    if (/deposit/i.test(label)) return "Pay deposit";
    if (label) return `Pay ${label}`;
    return "Pay next installment";
  }
  if (status === "declined") return "Find alternate";
  return null;
}

function paidTone(paid: number, quote: number | null): OverviewPaidTone {
  if (quote != null && quote > 0 && paid >= quote) return "full";
  if (paid > 0) return "part";
  return "none";
}

function buildNextPayment(
  budgetItems: OverviewBudgetItem[],
  payments: OverviewPayment[],
  scheduleRows: OverviewScheduleRow[],
  vendors: OverviewVendor[],
  todayKey: string,
): { nextPayment: OverviewNextPayment; allCovered: boolean } {
  if (scheduleRows.length === 0) {
    return { nextPayment: null, allCovered: false };
  }

  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const itemById = new Map(budgetItems.map((i) => [i.id, i]));

  const paidByItem = new Map<string, number>();
  for (const payment of payments) {
    paidByItem.set(
      payment.budget_item_id,
      (paidByItem.get(payment.budget_item_id) ?? 0) + Number(payment.amount),
    );
  }

  const scheduleByItem = new Map<string, OverviewScheduleRow[]>();
  for (const row of scheduleRows) {
    const list = scheduleByItem.get(row.budget_item_id) ?? [];
    list.push(row);
    scheduleByItem.set(row.budget_item_id, list);
  }

  type Candidate = {
    nextDue: NextDueInstallment;
    pastDue: boolean;
    item: OverviewBudgetItem;
  };
  const candidates: Candidate[] = [];
  const uncoveredAll: { id: string; due_on: string; amount: number }[] = [];

  for (const [itemId, installments] of scheduleByItem) {
    const item = itemById.get(itemId);
    if (!item) continue;
    const { schedule, nextDue, pastDue } = deriveScheduleWaterfall(
      installments,
      paidByItem.get(itemId) ?? 0,
      todayKey,
    );
    for (const row of schedule) {
      if (!row.covered) {
        uncoveredAll.push({
          id: row.id,
          due_on: row.due_on,
          amount: row.amount,
        });
      }
    }
    if (nextDue) candidates.push({ nextDue, pastDue, item });
  }

  if (candidates.length === 0) {
    return { nextPayment: null, allCovered: true };
  }

  candidates.sort((a, b) => {
    if (a.nextDue.due_on !== b.nextDue.due_on) {
      return a.nextDue.due_on.localeCompare(b.nextDue.due_on);
    }
    return a.nextDue.id.localeCompare(b.nextDue.id);
  });

  const soonest = candidates[0];
  const vendor =
    soonest.item.project_vendor_id != null
      ? vendorById.get(soonest.item.project_vendor_id)
      : null;
  const vendorName = vendor?.vendor.name?.trim() || null;
  const category = soonest.item.category?.trim() || null;
  const itemLabel = soonest.item.label?.trim() || null;
  // Display-only coalesce — never lead with payment_schedule.label.
  const primary =
    vendorName ?? category ?? itemLabel ?? "Scheduled payment";

  const { start, end } = quarterBounds(todayKey);
  const more = uncoveredAll.filter(
    (row) =>
      row.id !== soonest.nextDue.id &&
      row.due_on >= start &&
      row.due_on <= end,
  );

  return {
    nextPayment: {
      amount: soonest.nextDue.amount,
      due_on: soonest.nextDue.due_on,
      label: soonest.nextDue.label,
      primary,
      pastDue: soonest.pastDue,
      moreThisQuarter: {
        count: more.length,
        total: more.reduce((sum, row) => sum + row.amount, 0),
      },
    },
    allCovered: false,
  };
}

function buildAttention(
  tasks: OverviewTask[],
  todayKey: string,
  now: Date,
): OverviewAttentionItem[] {
  const items: OverviewAttentionItem[] = [];

  for (const task of tasks) {
    if (task.status === "done" || !task.due_date) continue;
    const days = daysUntil(task.due_date, todayKey);
    if (isTaskPastDue(task.due_date, task.status, now)) {
      const overdueDays = Math.abs(days);
      items.push({
        id: task.id,
        title: task.title.trim() || "Task",
        detail: `Overdue ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        tone: "rosewood",
      });
      continue;
    }
    if (days === 0) {
      items.push({
        id: task.id,
        title: task.title.trim() || "Task",
        detail: "Due today",
        tone: "clay",
      });
      continue;
    }
    if (days === 1) {
      items.push({
        id: task.id,
        title: task.title.trim() || "Task",
        detail: "Due tomorrow",
        tone: "clay",
      });
    }
  }

  return items
    .sort((a, b) => {
      if (a.tone !== b.tone) return a.tone === "rosewood" ? -1 : 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 8);
}

export function buildOverviewData(input: {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  totalBudget: number | null;
  tasks: OverviewTask[];
  budgetItems: OverviewBudgetItem[];
  payments: OverviewPayment[];
  scheduleRows: OverviewScheduleRow[];
  vendors: OverviewVendor[];
  /** Person-grain rows with household `rsvp_status` (Guests-tab summary). */
  people: Array<{ rsvp_status: RsvpStatus }>;
  errors: OverviewReadError;
  now?: Date;
}): OverviewData {
  const now = input.now ?? new Date();
  const todayKey = toLocalDateKey(now);
  const tasks = input.errors.tasks ? [] : input.tasks;
  const payments = input.errors.payments ? [] : input.payments;
  const budgetItems = input.errors.budgetItems ? [] : input.budgetItems;
  const scheduleRows = input.errors.schedule ? [] : input.scheduleRows;
  const vendors = input.errors.vendors ? [] : input.vendors;
  const people = input.errors.guests ? [] : input.people;

  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const paidTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const attending = countPeopleByHouseholdStatus(people, "attending");
  const declined = countPeopleByHouseholdStatus(people, "declined");
  const pending = countPeopleByHouseholdStatus(people, "pending");
  const rsvpTotal = people.length;

  const { nextPayment, allCovered } = buildNextPayment(
    budgetItems,
    payments,
    scheduleRows,
    vendors,
    todayKey,
  );

  const vendorRows: OverviewVendorRow[] = vendors.map((vendor) => {
    const money = deriveBookedVendorMoney(
      vendor.id,
      budgetItems,
      payments,
      scheduleRows,
      todayKey,
    );
    const linked = money.linkedItems.length > 0;
    const paid = linked ? (money.paid ?? 0) : null;
    const quote = vendor.quoted_price;
    const tone: OverviewPaidTone =
      !linked || paid == null ? "empty" : paidTone(paid, quote);

    return {
      vendor,
      paid,
      quote,
      paidTone: tone,
      nextDue: money.nextDue,
      nextStep: vendorNextStep(vendor.status, money.nextDue, quote),
    };
  });

  return {
    projectId: input.projectId,
    coupleNames: input.coupleNames,
    weddingDate: input.weddingDate,
    todayKey,
    totalBudget: input.errors.project ? null : input.totalBudget,
    paidTotal: input.errors.payments ? 0 : paidTotal,
    checklist: { done, total, percent },
    rsvp: {
      total: rsvpTotal,
      attending,
      declined,
      pending,
      responded: attending + declined,
    },
    nextPayment: input.errors.schedule || input.errors.payments ? null : nextPayment,
    allInstallmentsCovered:
      !input.errors.schedule && !input.errors.payments && allCovered,
    attention: input.errors.tasks ? [] : buildAttention(tasks, todayKey, now),
    vendorRows,
    errors: input.errors,
  };
}

export function overviewDuePill(dueOn: string, todayKey: string, pastDue: boolean) {
  const days = daysUntil(dueOn, todayKey);
  if (pastDue || days < 0) {
    const n = Math.abs(days);
    return {
      label: `${n} day${n === 1 ? "" : "s"} overdue`,
      urgent: true as const,
    };
  }
  if (days === 0) {
    return { label: "Due today", urgent: true as const };
  }
  if (days <= 7) {
    return {
      label: `in ${days} day${days === 1 ? "" : "s"}`,
      urgent: true as const,
    };
  }
  return {
    label: `in ${days} days`,
    urgent: false as const,
  };
}

export function daysUntilWedding(weddingDate: string, todayKey: string) {
  return Math.max(0, daysUntil(weddingDate, todayKey));
}
