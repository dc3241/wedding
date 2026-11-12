/** Public directory categories. `path` is the URL segment under /wedding-vendors/[state]/. */
export type DirectoryCategory = {
  path: string;
  /** Values of directory_listings.category included on this page. */
  categories: readonly string[];
  /** e.g. "Wedding photographers" */
  plural: string;
  /** e.g. "wedding photographer" */
  singular: string;
  /** Hub tab label */
  tab: string;
};

export const VENDOR_CATEGORIES: readonly DirectoryCategory[] = [
  { path: "photographers", categories: ["photographer"], plural: "Wedding photographers", singular: "wedding photographer", tab: "Photographers" },
  { path: "florists", categories: ["florist"], plural: "Wedding florists", singular: "wedding florist", tab: "Florists" },
  { path: "dj-music", categories: ["dj", "band"], plural: "Wedding DJs & live music", singular: "wedding DJ or band", tab: "DJs & music" },
];

export function categoryByPath(path: string): DirectoryCategory | null {
  return VENDOR_CATEGORIES.find((c) => c.path === path) ?? null;
}

/** Noun for a single listing, by its stored category id. */
export function listingNoun(category: string): string {
  switch (category) {
    case "venue": return "wedding venue";
    case "photographer": return "wedding photographer";
    case "florist": return "wedding florist";
    case "dj": return "wedding DJ";
    case "band": return "wedding band";
    default: return "wedding vendor";
  }
}

/** The page a listing's breadcrumb should point back to. */
export function listingParent(category: string): { label: string; sub: string | null } {
  const cat = VENDOR_CATEGORIES.find((c) => c.categories.includes(category));
  return cat ? { label: cat.plural, sub: cat.path } : { label: "Wedding venues", sub: null };
}

/** Category pages with fewer listings than this stay out of the index. */
export const MIN_INDEXABLE_LISTINGS = 3;
