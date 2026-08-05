import type { PlacesPriceLevel } from "@/lib/places-text-search";

/** Pip / filter level 1–4 ($ … $$$$). Free and unspecified are unpriced. */
export type PricePip = 1 | 2 | 3 | 4;

export function priceLevelToPip(
  priceLevel: PlacesPriceLevel | undefined,
): PricePip | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return null;
  }
}

export function formatPriceLevel(
  priceLevel: PlacesPriceLevel | undefined,
): string {
  const pip = priceLevelToPip(priceLevel);
  if (pip == null) return "Price n/a";
  return "$".repeat(pip);
}

const SKIP_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "food",
  "store",
  "health",
  "finance",
  "general_contractor",
]);

export function humanizePlaceType(type: string): string {
  return type
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Prefer primaryType, then up to two useful `types` chips. */
export function placeTypeChips(
  primaryType: string | undefined,
  types: string[] | undefined,
  max = 2,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  function push(raw: string | undefined) {
    if (!raw || SKIP_TYPES.has(raw) || seen.has(raw)) return;
    seen.add(raw);
    out.push(humanizePlaceType(raw));
  }

  push(primaryType);
  for (const t of types ?? []) {
    if (out.length >= max) break;
    push(t);
  }
  return out;
}

export function placePhotoSrc(photoName: string, maxWidthPx = 420): string {
  const params = new URLSearchParams({
    name: photoName,
    maxWidthPx: String(maxWidthPx),
  });
  return `/api/place-photo?${params.toString()}`;
}

export function googleMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}

export function websiteHost(uri?: string): string | null {
  if (!uri?.trim()) return null;
  try {
    const host = new URL(uri).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}
