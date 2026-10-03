import {
  getVendorCategoryById,
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export type CompareCandidate = {
  id: string;
  category: string | null;
};

export type CompareSelection =
  | {
      ok: true;
      ids: string[];
      categoryKey: string;
      categoryLabel: string;
    }
  | { ok: false; reason: "too_few" | "too_many" | "mixed" };

/** Stable key for a stored category id or a legacy free-text label. */
export function vendorCategoryKey(
  category: string | null | undefined,
): string | null {
  const raw = category?.trim();
  if (!raw) return null;

  const byId = getVendorCategoryById(raw);
  if (byId) return byId.id;

  const byLabel = VENDOR_CATEGORIES.find(
    (item) => item.label.toLowerCase() === raw.toLowerCase(),
  );
  if (byLabel) return byLabel.id;

  return raw.toLowerCase();
}

/**
 * Compare is two to four shortlist vendors that share one category.
 * Missing categories do not count as a shared group.
 */
export function compareSelection(items: CompareCandidate[]): CompareSelection {
  if (items.length < COMPARE_MIN) return { ok: false, reason: "too_few" };
  if (items.length > COMPARE_MAX) return { ok: false, reason: "too_many" };

  const keys = items.map((item) => vendorCategoryKey(item.category));
  const first = keys[0];
  if (!first || keys.some((key) => key !== first)) {
    return { ok: false, reason: "mixed" };
  }

  const labelSource = items.find(
    (item) => vendorCategoryKey(item.category) === first,
  );

  return {
    ok: true,
    ids: items.map((item) => item.id),
    categoryKey: first,
    categoryLabel: labelSource?.category
      ? vendorCategoryLabel(labelSource.category)
      : "Uncategorized",
  };
}
