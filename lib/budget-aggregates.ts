export type LinkedVendor = {
  id: string;
  name: string;
  quotedPrice: number | null;
  status: string;
};

export type BudgetItemForAggregate = {
  id: string;
  category: string | null;
  label: string;
  planned_amount: number;
  actual_amount: number | null;
  notes: string | null;
  project_vendor_id: string | null;
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
  spent: number;
  committed: number;
  unallocated: number | null;
  perCategory: BudgetCategoryGroup[];
  untrackedCategoryCount: number;
  needsAttention: {
    overCategories: string[];
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

export function computeBudgetAggregates(
  items: {
    id: string;
    category: string | null;
    label: string;
    planned_amount: number;
    actual_amount: number | null;
    notes: string | null;
    project_vendor_id: string | null;
  }[],
  totalBudget: number | null,
  vendors: ProjectVendorOption[],
): BudgetAggregates {
  // Headline figures are items-only — quotes never enter these sums.
  // Coerce on every arithmetic path (PostgREST numerics may arrive as strings).
  const allocated = items.reduce(
    (sum, item) => sum + Number(item.planned_amount),
    0,
  );
  const spent = items.reduce(
    (sum, item) => sum + Number(item.actual_amount ?? 0),
    0,
  );
  const committed = Math.max(allocated - spent, 0);
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

    return {
      id: item.id,
      category: item.category,
      label: item.label,
      planned_amount: Number(item.planned_amount),
      actual_amount:
        item.actual_amount == null ? null : Number(item.actual_amount),
      notes: item.notes,
      project_vendor_id: item.project_vendor_id,
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
      const actualTotal = groupItems.reduce(
        (sum, item) => sum + Number(item.actual_amount ?? 0),
        0,
      );
      return {
        category,
        plannedTotal,
        actualTotal,
        items: groupItems,
        isOver: actualTotal > plannedTotal,
      };
    });

  const untrackedCategoryCount = perCategory.filter(
    (group) => group.actualTotal === 0,
  ).length;

  const overCategories = perCategory
    .filter((group) => group.isOver)
    .map((group) => group.category);

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
    spent,
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
