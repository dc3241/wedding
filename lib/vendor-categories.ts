/** Canonical vendor search categories — single source for search + add. */

const SERVICE_AREA_DENIED_PRIMARY_TYPES = [
  "bar",
  "bar_and_grill",
  "night_club",
  "restaurant",
  "pub",
  "liquor_store",
  "cafe",
  "hotel",
  "lodging",
] as const;

export type VendorCategory = {
  id: string;
  label: string;
  /** Template for Places textQuery; `{location}` is replaced server-side. */
  queryTemplate: string;
  /** Google Places Table A type, or null when Google has no matching type. */
  includedType: string | null;
  /** Applied only when `includedType` is null. */
  deniedPrimaryTypes: readonly string[];
};

export const VENDOR_CATEGORIES: readonly VendorCategory[] = [
  {
    id: "venue",
    label: "Venue",
    queryTemplate: "wedding venue in {location}",
    includedType: "wedding_venue",
    deniedPrimaryTypes: [],
  },
  {
    id: "caterer",
    label: "Caterer",
    queryTemplate: "wedding caterer in {location}",
    includedType: "catering_service",
    deniedPrimaryTypes: [],
  },
  {
    id: "florist",
    label: "Florist",
    queryTemplate: "wedding florist in {location}",
    includedType: "florist",
    deniedPrimaryTypes: [],
  },
  {
    id: "baker",
    label: "Baker",
    queryTemplate: "wedding bakery in {location}",
    includedType: "bakery",
    deniedPrimaryTypes: [],
  },
  {
    id: "hair-makeup",
    label: "Hair & makeup",
    queryTemplate: "wedding hair and makeup in {location}",
    includedType: "makeup_artist",
    deniedPrimaryTypes: [],
  },
  {
    id: "jewelry",
    label: "Jewelry",
    queryTemplate: "wedding jewelry in {location}",
    includedType: "jewelry_store",
    deniedPrimaryTypes: [],
  },
  {
    id: "photographer",
    label: "Photographer",
    queryTemplate: "wedding photographer in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "videographer",
    label: "Videographer",
    queryTemplate: "wedding videographer in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "dj",
    label: "DJ",
    queryTemplate: "wedding DJ in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "band",
    label: "Band",
    queryTemplate: "wedding band in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "officiant",
    label: "Officiant",
    queryTemplate: "wedding officiant in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "planner",
    label: "Planner",
    queryTemplate: "wedding planner in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
  {
    id: "rentals",
    label: "Rentals",
    queryTemplate: "wedding rentals in {location}",
    includedType: null,
    deniedPrimaryTypes: SERVICE_AREA_DENIED_PRIMARY_TYPES,
  },
] as const;

const BY_ID = new Map(VENDOR_CATEGORIES.map((c) => [c.id, c]));

export function getVendorCategoryById(id: string): VendorCategory | undefined {
  return BY_ID.get(id);
}

/** Resolve a stored category id (or legacy free-text) to a display label. */
export function vendorCategoryLabel(category: string): string {
  return getVendorCategoryById(category)?.label ?? category;
}

export function composeVendorTextQuery(
  category: VendorCategory,
  location: string,
  refinement?: string,
): string {
  const base = category.queryTemplate.replace("{location}", location.trim());
  const trimmed = refinement?.trim();
  return trimmed ? `${base} ${trimmed}` : base;
}
