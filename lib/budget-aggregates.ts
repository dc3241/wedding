export type LinkedVendor = {
  id: string;
  name: string;
  quotedPrice: number | null;
  status: string;
};

export type BudgetPaymentForAggregate = {
  id: string;
  budget_item_id: string;
  amount: number;
  paid_on: string | null;
  note: string | null;
};

export type ScheduleInstallmentForAggregate = {
  id: string;
  budget_item_id: string;
  amount: number;
  due_on: string;
  label: string | null;
  /** Covered when running sum through this installment ≤ Σ ledger. Auto-derived. */
  covered: boolean;
};

export type NextDueInstallment = {
  id: string;
  amount: number;
  due_on: string;
  label: string | null;
};

export type BudgetItemForAggregate = {
  id: string;
  category: string | null;
  label: string | null;
  planned_amount: number;
  actual_amount: number | null;
  /** Legacy column — write-dead after BUD-SCHED-01; prefer schedule. */
  due_date: string | null;
  notes: string | null;
  project_vendor_id: string | null;
  /** Σ ledger payments for this item — never derived from actual_amount. */
  paid: number;
  /** Estimate − Actual (Actual coerced to 0 when null). */
  difference: number;
  payments: BudgetPaymentForAggregate[];
  schedule: ScheduleInstallmentForAggregate[];
  /** First uncovered installment after waterfall, or null. */
  nextDue: NextDueInstallment | null;
  /** nextDue exists and due_on < todayKey (local date). */
  pastDue: boolean;
  linkedVendor: LinkedVendor | null;
  /** Vendor-level package variance (quote − sum of linked planned). Always the sum math. */
  quoteVariance: number | null;
  linkedItemCount: number;
};

export type ProjectVendorOption = {
  id: string;
  name: string;
  quoted_price: number | null;
  status: string;
};

/** Per linked vendor — derived at read time, never stored. */
export type VendorPackageStats = {
  id: string;
  name: string;
  quotedPrice: number | null;
  sumPlanned: number;
  variance: number | null;
  linkedItemCount: number;
};

export type BudgetCategoryGroup = {
  category: string;
  plannedTotal: number;
  actualTotal: number;
  items: BudgetItemForAggregate[];
  isOver: boolean;
};

export type VendorReconciliation = {
  bookedCount: number;
  bookedUnlinkedCount: number;
  bookedUnlinkedQuotedTotal: number;
  unlinkedVendors: { id: string; name: string }[];
};

export type BudgetAggregates = {
  totalBudget: number | null;
  allocated: number;
  /** Σ actual_amount — cost Actual, not Paid. */
  actualTotal: number;
  /** Σ budget_payments.amount — the only Paid source. */
  paidTotal: number;
  /**
   * Planned-but-not-yet-paid (BUD-03 semantic shift).
   * Was: allocated − Σ actual_amount. Now: allocated − paidTotal.
   */
  committed: number;
  unallocated: number | null;
  perCategory: BudgetCategoryGroup[];
  untrackedCategoryCount: number;
  needsAttention: {
    /** Over-plan alerts with dollar overage (actualTotal − plannedTotal). */
    overCategories: { category: string; overage: number }[];
    untrackedCategoryCount: number;
    categoryCount: number;
  };
  vendorReconciliation: VendorReconciliation;
  vendorPackages: VendorPackageStats[];
};

function categoryKey(category: string | null | undefined): string {
  const trimmed = category?.trim() ?? "";
  return trimmed === "" ? "Uncategorized" : trimmed;
}

/**
 * Waterfall: sort by due_on; running sum; covered when running ≤ totalPaid;
 * first installment whose running exceeds totalPaid is next owed.
 */
export function deriveScheduleWaterfall(
  installments: {
    id: string;
    budget_item_id: string;
    amount: number;
    due_on: string;
    label: string | null;
  }[],
  totalPaid: number,
  todayKey: string,
): {
  schedule: ScheduleInstallmentForAggregate[];
  nextDue: NextDueInstallment | null;
  pastDue: boolean;
} {
  const sorted = [...installments].sort((a, b) => {
    if (a.due_on !== b.due_on) return a.due_on.localeCompare(b.due_on);
    return a.id.localeCompare(b.id);
  });

  let running = 0;
  let nextDue: NextDueInstallment | null = null;
  const schedule: ScheduleInstallmentForAggregate[] = sorted.map((row) => {
    running += Number(row.amount);
    const covered = running <= totalPaid;
    if (!covered && nextDue === null) {
      nextDue = {
        id: row.id,
        amount: Number(row.amount),
        due_on: row.due_on,
        label: row.label,
      };
    }
    return {
      id: row.id,
      budget_item_id: row.budget_item_id,
      amount: Number(row.amount),
      due_on: row.due_on,
      label: row.label,
      covered,
    };
  });

  const pastDue =
    nextDue != null && (nextDue as NextDueInstallment).due_on < todayKey;

  return { schedule, nextDue, pastDue };
}

export function computeBudgetAggregates(
  items: {
    id: string;
    category: string | null;
    label: string | null;
    planned_amount: number;
    actual_amount: number | null;
    due_date?: string | null;
    notes: string | null;
    project_vendor_id: string | null;
  }[],
  totalBudget: number | null,
  vendors: ProjectVendorOption[],
  payments: {
    id: string;
    budget_item_id: string;
    amount: number;
    paid_on: string | null;
    note: string | null;
  }[] = [],
  scheduleRows: {
    id: string;
    budget_item_id: string;
    amount: number;
    due_on: string;
    label: string | null;
  }[] = [],
  todayKey: string = "9999-12-31",
): BudgetAggregates {
  // Headline figures are items-only — quotes never enter these sums.
  // Coerce on every arithmetic path (PostgREST numerics may arrive as strings).
  const allocated = items.reduce(
    (sum, item) => sum + Number(item.planned_amount),
    0,
  );
  const actualTotal = items.reduce(
    (sum, item) => sum + Number(item.actual_amount ?? 0),
    0,
  );

  const paymentsByItem = new Map<string, BudgetPaymentForAggregate[]>();
  let paidTotal = 0;
  for (const row of payments) {
    const payment: BudgetPaymentForAggregate = {
      id: row.id,
      budget_item_id: row.budget_item_id,
      amount: Number(row.amount),
      paid_on: row.paid_on,
      note: row.note,
    };
    paidTotal += payment.amount;
    const bucket = paymentsByItem.get(payment.budget_item_id) ?? [];
    bucket.push(payment);
    paymentsByItem.set(payment.budget_item_id, bucket);
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
  for (const row of scheduleRows) {
    const installment = {
      id: row.id,
      budget_item_id: row.budget_item_id,
      amount: Number(row.amount),
      due_on: row.due_on,
      label: row.label,
    };
    const bucket = scheduleByItem.get(installment.budget_item_id) ?? [];
    bucket.push(installment);
    scheduleByItem.set(installment.budget_item_id, bucket);
  }

  // BUD-03: committed = planned-but-not-yet-paid (was allocated − Σ actual_amount).
  const committed = Math.max(allocated - paidTotal, 0);
  const unallocated =
    totalBudget === null ? null : Number(totalBudget) - allocated;

  const vendorsById = new Map(vendors.map((v) => [v.id, v]));

  // Package math first — no branch on linkedItemCount.
  const sumPlannedByVendor = new Map<string, number>();
  const linkedCountByVendor = new Map<string, number>();
  for (const item of items) {
    const vendorId = item.project_vendor_id;
    if (vendorId == null) continue;
    sumPlannedByVendor.set(
      vendorId,
      (sumPlannedByVendor.get(vendorId) ?? 0) + Number(item.planned_amount),
    );
    linkedCountByVendor.set(
      vendorId,
      (linkedCountByVendor.get(vendorId) ?? 0) + 1,
    );
  }

  const vendorPackages: VendorPackageStats[] = [];
  const packagesById = new Map<string, VendorPackageStats>();
  for (const vendor of vendors) {
    const linkedItemCount = linkedCountByVendor.get(vendor.id) ?? 0;
    if (linkedItemCount === 0) continue;

    const quotedPrice =
      vendor.quoted_price == null ? null : Number(vendor.quoted_price);
    const sumPlanned = Number(sumPlannedByVendor.get(vendor.id) ?? 0);
    const variance =
      quotedPrice == null ? null : quotedPrice - sumPlanned;

    const stats: VendorPackageStats = {
      id: vendor.id,
      name: vendor.name,
      quotedPrice,
      sumPlanned,
      variance,
      linkedItemCount,
    };
    vendorPackages.push(stats);
    packagesById.set(vendor.id, stats);
  }

  const enriched: BudgetItemForAggregate[] = items.map((item) => {
    const linked =
      item.project_vendor_id != null
        ? (vendorsById.get(item.project_vendor_id) ?? null)
        : null;
    const pkg =
      item.project_vendor_id != null
        ? (packagesById.get(item.project_vendor_id) ?? null)
        : null;

    const linkedVendor: LinkedVendor | null = linked
      ? {
          id: linked.id,
          name: linked.name,
          quotedPrice:
            linked.quoted_price == null ? null : Number(linked.quoted_price),
          status: linked.status,
        }
      : null;

    const itemPayments = paymentsByItem.get(item.id) ?? [];
    const paid = itemPayments.reduce((sum, p) => sum + p.amount, 0);
    const planned = Number(item.planned_amount);
    const actual =
      item.actual_amount == null ? null : Number(item.actual_amount);
    const difference = planned - Number(actual ?? 0);

    const { schedule, nextDue, pastDue } = deriveScheduleWaterfall(
      scheduleByItem.get(item.id) ?? [],
      paid,
      todayKey,
    );

    return {
      id: item.id,
      category: item.category,
      label: item.label,
      planned_amount: planned,
      actual_amount: actual,
      due_date: item.due_date ?? null,
      notes: item.notes,
      project_vendor_id: item.project_vendor_id,
      paid,
      difference,
      payments: itemPayments,
      schedule,
      nextDue,
      pastDue,
      linkedVendor,
      quoteVariance: pkg?.variance ?? null,
      linkedItemCount: pkg?.linkedItemCount ?? 0,
    };
  });

  const byCategory = new Map<string, BudgetItemForAggregate[]>();
  for (const item of enriched) {
    const key = categoryKey(item.category);
    const bucket = byCategory.get(key) ?? [];
    bucket.push(item);
    byCategory.set(key, bucket);
  }

  const perCategory: BudgetCategoryGroup[] = [...byCategory.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((category) => {
      const groupItems = byCategory.get(category) ?? [];
      const plannedTotal = groupItems.reduce(
        (sum, item) => sum + Number(item.planned_amount),
        0,
      );
      const groupActualTotal = groupItems.reduce(
        (sum, item) => sum + Number(item.actual_amount ?? 0),
        0,
      );
      return {
        category,
        plannedTotal,
        actualTotal: groupActualTotal,
        items: groupItems,
        isOver: groupActualTotal > plannedTotal,
      };
    });

  const untrackedCategoryCount = perCategory.filter(
    (group) => group.actualTotal === 0,
  ).length;

  const overCategories = perCategory
    .filter((group) => group.isOver)
    .map((group) => ({
      category: group.category,
      overage: group.actualTotal - group.plannedTotal,
    }));

  const linkedIds = new Set(
    enriched
      .map((item) => item.project_vendor_id)
      .filter((id): id is string => id != null),
  );

  const booked = vendors.filter((v) => v.status === "booked");
  const bookedUnlinked = booked.filter((v) => !linkedIds.has(v.id));
  const bookedUnlinkedQuotedTotal = bookedUnlinked.reduce(
    (sum, v) => sum + (v.quoted_price == null ? 0 : Number(v.quoted_price)),
    0,
  );

  return {
    totalBudget: totalBudget == null ? null : Number(totalBudget),
    allocated,
    actualTotal,
    paidTotal,
    committed,
    unallocated,
    perCategory,
    untrackedCategoryCount,
    needsAttention: {
      overCategories,
      untrackedCategoryCount,
      categoryCount: perCategory.length,
    },
    vendorReconciliation: {
      bookedCount: booked.length,
      bookedUnlinkedCount: bookedUnlinked.length,
      bookedUnlinkedQuotedTotal,
      unlinkedVendors: bookedUnlinked.map((v) => ({
        id: v.id,
        name: v.name,
      })),
    },
    vendorPackages,
  };
}

/** Suppress over-plan alerts while current overage ≤ snapshot (dismiss-until-worse). */
export function applyOverPlanDismissals(
  overCategories: { category: string; overage: number }[],
  dismissals: { category: string; overage_at_dismiss: number }[],
): { category: string; overage: number }[] {
  if (dismissals.length === 0) return overCategories;

  const snapshotByCategory = new Map(
    dismissals.map((row) => [
      row.category,
      Number(row.overage_at_dismiss),
    ]),
  );

  return overCategories.filter((alert) => {
    const snapshot = snapshotByCategory.get(alert.category);
    if (snapshot === undefined) return true;
    return alert.overage > snapshot;
  });
}
