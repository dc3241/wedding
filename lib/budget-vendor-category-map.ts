/**
 * Read-time map from budget_items.category (free-text) → canonical vendor
 * category id. Keys are the literal BUDGET_QUICK_CATEGORIES strings only;
 * unrecognized / unmapped input returns null (silence, not an error).
 * Does NOT unify vocabularies — budget stays free-text at rest.
 */

import {
  BUDGET_QUICK_CATEGORIES,
  type BudgetQuickCategory,
} from "@/lib/budget-quick-categories";

export type VendorCategoryId =
  | "venue"
  | "caterer"
  | "florist"
  | "baker"
  | "hair-makeup"
  | "jewelry"
  | "photographer"
  | "videographer"
  | "dj"
  | "band"
  | "officiant"
  | "planner"
  | "rentals";

const BUDGET_TO_VENDOR: Partial<
  Record<BudgetQuickCategory, VendorCategoryId>
> = {
  Venue: "venue",
  Catering: "caterer",
  Photography: "photographer",
  Videographer: "videographer",
  Florals: "florist",
  "DJ / Entertainment": "dj",
  Cake: "baker",
  "Hair & Makeup": "hair-makeup",
  Rentals: "rentals",
  Officiant: "officiant",
  // Attire, Stationery, Transportation, Decor, Bar, Favors — no vendor id
};

const BY_LOWER = new Map<string, VendorCategoryId>();
for (const budgetLabel of BUDGET_QUICK_CATEGORIES) {
  const vendorId = BUDGET_TO_VENDOR[budgetLabel];
  if (vendorId) {
    BY_LOWER.set(budgetLabel.toLowerCase(), vendorId);
  }
}

export function mapBudgetCategoryToVendorCategory(
  category: string,
): VendorCategoryId | null {
  const key = category.trim().toLowerCase();
  if (!key) return null;
  return BY_LOWER.get(key) ?? null;
}
