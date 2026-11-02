/**
 * COUPLES-PIVOT (Oct 2026): First Look markets to couples only.
 *
 * Planner / venue features stay fully built and keep working for existing
 * business accounts — this flag only hides them from the public site and
 * from new signups. Flip to `true` to bring the B2B marketing back:
 * nav + footer links, sitemap entries, indexable B2B pages, the
 * planner/venue welcome options, and the planner/venue pricing cards.
 */
export const B2B_MARKETING_ENABLED = false;

/** Public marketing pages that exist for planners/venues only. */
export const B2B_MARKETING_PATHS = [
  "/for-planners",
  "/for-venues",
  "/wedding-planner-crm",
  "/honeybook-alternative",
  "/dubsado-alternative",
  "/wedding-inquiry-pipeline",
  "/wedding-planner-contract-template",
] as const;

export function isB2bMarketingPath(path: string): boolean {
  return (B2B_MARKETING_PATHS as readonly string[]).includes(path);
}

/**
 * Where "the couple product" lives. With B2B marketing off, "/" is the
 * couple landing and /for-couples permanently redirects there (one URL,
 * no duplicate-content split).
 */
export const COUPLE_LANDING_PATH = B2B_MARKETING_ENABLED ? "/for-couples" : "/";

/** Social share image. The planner one shows Leads / Vendors / Contracts. */
export const OG_IMAGE_PATH = B2B_MARKETING_ENABLED
  ? "/og-image.png"
  : "/og-couple.png";
