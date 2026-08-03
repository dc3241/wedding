import {
  deriveScheduleWaterfall,
  type BudgetPaymentForAggregate,
  type NextDueInstallment,
  type ScheduleInstallmentForAggregate,
} from "@/lib/budget-aggregates";

export type BookedBudgetItemInput = {
  id: string;
  category: string | null;
  label: string | null;
  actual_amount: number | null;
  notes: string | null;
  project_vendor_id: string | null;
};

export type BookedPaymentInput = {
  id: string;
  budget_item_id: string;
  amount: number;
  paid_on: string | null;
  note: string | null;
};

export type BookedScheduleInput = {
  id: string;
  budget_item_id: string;
  amount: number;
  due_on: string;
  label: string | null;
};

export type BookedLinkedItemMoney = {
  id: string;
  category: string | null;
  label: string | null;
  actual_amount: number | null;
  notes: string | null;
  paid: number;
  nextDue: NextDueInstallment | null;
  pastDue: boolean;
  payments: BudgetPaymentForAggregate[];
  schedule: ScheduleInstallmentForAggregate[];
};

export type BookedVendorMoney = {
  linkedItems: BookedLinkedItemMoney[];
  /** Sum of non-null actual_amount; null when unlinked or every Actual is null. */
  price: number | null;
  /** Σ ledger only — 0 when linked with no payments; null when unlinked. */
  paid: number | null;
  nextDue: NextDueInstallment | null;
  pastDue: boolean | null;
  notes: string | null;
};

/**
 * Read-through money model for one project_vendor from its linked budget_items.
 * Many items → sum Actual / sum Paid; nextDue = earliest uncovered; pastDue if any.
 */
export function deriveBookedVendorMoney(
  projectVendorId: string,
  items: BookedBudgetItemInput[],
  payments: BookedPaymentInput[],
  scheduleRows: BookedScheduleInput[],
  todayKey: string,
): BookedVendorMoney {
  const linked = items.filter((i) => i.project_vendor_id === projectVendorId);

  if (linked.length === 0) {
    return {
      linkedItems: [],
      price: null,
      paid: null,
      nextDue: null,
      pastDue: null,
      notes: null,
    };
  }

  const linkedItems: BookedLinkedItemMoney[] = linked.map((item) => {
    const itemPayments: BudgetPaymentForAggregate[] = payments
      .filter((p) => p.budget_item_id === item.id)
      .map((p) => ({
        id: p.id,
        budget_item_id: p.budget_item_id,
        amount: Number(p.amount),
        paid_on: p.paid_on,
        note: p.note,
      }));
    const paid = itemPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const itemSchedule = scheduleRows.filter(
      (s) => s.budget_item_id === item.id,
    );
    const { schedule, nextDue, pastDue } = deriveScheduleWaterfall(
      itemSchedule,
      paid,
      todayKey,
    );
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      actual_amount: item.actual_amount,
      notes: item.notes,
      paid,
      nextDue,
      pastDue,
      payments: itemPayments,
      schedule,
    };
  });

  const actuals = linkedItems
    .map((i) => i.actual_amount)
    .filter((a): a is number => a != null);
  const price = actuals.length === 0 ? null : actuals.reduce((s, a) => s + a, 0);
  const paid = linkedItems.reduce((s, i) => s + i.paid, 0);

  const uncovered = linkedItems
    .map((i) => i.nextDue)
    .filter((d): d is NextDueInstallment => d != null)
    .sort((a, b) => {
      if (a.due_on !== b.due_on) return a.due_on.localeCompare(b.due_on);
      return a.id.localeCompare(b.id);
    });
  const nextDue = uncovered[0] ?? null;
  const pastDue = linkedItems.some((i) => i.pastDue);

  const noteParts = linkedItems
    .map((i) => i.notes?.trim())
    .filter((n): n is string => Boolean(n));
  const notes = noteParts.length === 0 ? null : noteParts.join(" · ");

  return { linkedItems, price, paid, nextDue, pastDue, notes };
}

export function budgetItemDisplayName(item: {
  category: string | null;
  label: string | null;
}): string {
  const label = item.label?.trim() ?? "";
  if (label) return label;
  const category = item.category?.trim() ?? "";
  return category !== "" ? category : "Budget item";
}
