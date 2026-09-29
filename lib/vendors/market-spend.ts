import "server-only";

import { mapBudgetCategoryToVendorCategory } from "@/lib/budget-vendor-category-map";
import type { VendorMarketContext } from "@/lib/vendors/market-context";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const MIN_QUOTES = 8;

async function loadMedianQuote(
  categoryId: string,
): Promise<{ medianQuote: number | null; quoteCount: number }> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc("vendor_category_quote_median", {
      p_category: categoryId,
    });
    if (error || !data) return { medianQuote: null, quoteCount: 0 };

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") {
      return { medianQuote: null, quoteCount: 0 };
    }

    const count = Number(
      "quote_count" in row ? row.quote_count : 0,
    );
    const median = Number(
      "median_quote" in row ? row.median_quote : NaN,
    );
    if (!Number.isFinite(count) || count < MIN_QUOTES || !Number.isFinite(median)) {
      return { medianQuote: null, quoteCount: Number.isFinite(count) ? count : 0 };
    }
    return { medianQuote: Math.round(median), quoteCount: count };
  } catch {
    return { medianQuote: null, quoteCount: 0 };
  }
}

async function loadYourBudget(
  projectId: string,
  categoryId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_items")
    .select("category, planned_amount")
    .eq("project_id", projectId);

  if (error || !data) return null;

  let total = 0;
  for (const row of data) {
    const category = typeof row.category === "string" ? row.category : "";
    if (mapBudgetCategoryToVendorCategory(category) !== categoryId) continue;
    const amount = Number(row.planned_amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    total += amount;
  }

  return total > 0 ? Math.round(total) : null;
}

export async function loadVendorMarketContext(
  projectId: string,
  categoryId: string,
  categoryLabel: string,
): Promise<VendorMarketContext> {
  const [quotes, yourBudget] = await Promise.all([
    loadMedianQuote(categoryId),
    loadYourBudget(projectId, categoryId),
  ]);

  return {
    categoryLabel,
    medianQuote: quotes.medianQuote,
    quoteCount: quotes.quoteCount,
    yourBudget,
  };
}
