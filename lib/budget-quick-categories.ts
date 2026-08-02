/**
 * UI-suggestion picks for budget Quick add only.
 * Deliberately NOT derived from VENDOR_CATEGORIES — budget_items.category
 * stays free-text (bible §3 / §13). Do not unify or CHECK this list.
 */
export const BUDGET_QUICK_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Videographer",
  "Florals",
  "DJ / Entertainment",
  "Cake",
  "Attire",
  "Hair & Makeup",
  "Rentals",
  "Stationery",
  "Transportation",
  "Officiant",
  "Decor",
  "Bar",
  "Favors",
] as const;

export type BudgetQuickCategory = (typeof BUDGET_QUICK_CATEGORIES)[number];
