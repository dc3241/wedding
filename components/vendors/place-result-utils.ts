import { formatCurrency } from "@/lib/format-currency";
import type {
  PlacesMoney,
  PlacesPriceLevel,
  PlacesPriceRange,
} from "@/lib/places-text-search";
import type { VendorSitePrice } from "@/lib/vendors/site-price-extract";

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
): string | null {
  const pip = priceLevelToPip(priceLevel);
  if (pip == null) return null;
  return "$".repeat(pip);
}

/** Categories where a Google visit/meal range is a useful price. */
const GOOGLE_RANGE_CATEGORIES = new Set([
  "caterer",
  "baker",
  "florist",
  "jewelry",
]);

function moneyAmount(money: PlacesMoney | undefined): number | null {
  if (!money) return null;
  if (money.currencyCode && money.currencyCode !== "USD") return null;
  const units = Number(money.units ?? "0");
  const nanos = money.nanos ?? 0;
  if (!Number.isFinite(units) || !Number.isFinite(nanos)) return null;
  const value = units + nanos / 1_000_000_000;
  if (value <= 0) return null;
  return value;
}

/**
 * Google's currency range. Venues only when the low end is at least $1,000,
 * so a meal-sized figure is not shown as the venue cost. Other categories
 * use it only where a typical visit price is meaningful.
 */
export function eligibleGoogleRange(
  priceRange: PlacesPriceRange | undefined,
  categoryId: string,
): { start: number; end: number | null } | null {
  const start = moneyAmount(priceRange?.startPrice);
  const end = moneyAmount(priceRange?.endPrice);
  if (start == null && end == null) return null;

  const low = start ?? end!;
  const high = end != null && start != null && end > start ? end : null;

  if (categoryId === "venue") {
    if (low < 1000) return null;
    return { start: low, end: high };
  }

  if (!GOOGLE_RANGE_CATEGORIES.has(categoryId)) return null;
  return { start: low, end: high };
}

export type PlacePriceView = {
  primary: string;
  source: string | null;
  detail: string | null;
};

type PricedPlace = {
  priceLevel?: PlacesPriceLevel;
  priceRange?: PlacesPriceRange;
  sitePrice?: VendorSitePrice | null;
};

export function describePlacePrice(
  place: PricedPlace,
  categoryId: string,
): PlacePriceView | null {
  const site = place.sitePrice;
  if (site && (site.startingAmount != null || site.packages.length > 0)) {
    const packageLine = site.packages
      .slice(0, 3)
      .map((item) => `${item.name} ${formatCurrency(item.amount)}`)
      .join(" · ");
    const primary =
      site.startingAmount != null
        ? `From ${formatCurrency(site.startingAmount)}${site.perPerson ? " per person" : ""}`
        : packageLine;
    return {
      primary,
      source: "From their website",
      detail: site.startingAmount != null && packageLine ? packageLine : null,
    };
  }

  const range = eligibleGoogleRange(place.priceRange, categoryId);
  if (range) {
    const primary =
      range.end != null
        ? `${formatCurrency(range.start)}–${formatCurrency(range.end)}`
        : `From ${formatCurrency(range.start)}`;
    return { primary, source: "Typical range on Google", detail: null };
  }

  const pips = formatPriceLevel(place.priceLevel);
  if (pips) return { primary: pips, source: null, detail: null };
  return null;
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
