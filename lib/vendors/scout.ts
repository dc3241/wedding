import "server-only";

import {
  composeVendorTextQuery,
  getVendorCategoryById,
  VENDOR_CATEGORIES,
} from "@/lib/vendor-categories";
import { placesTextSearch } from "@/lib/places-text-search";
import { resolveProjectLocationHint } from "@/lib/resolve-project-location-hint";
import { loadVendorMarketContext } from "@/lib/vendors/market-spend";
import type { SupabaseClient } from "@supabase/supabase-js";

/** AGENTIC-02 — vendor scouting for the assistant (search + verified place lookup). */

export const SCOUT_RESULT_CAP = 10;
export const MAX_SHORTLIST_ADDS = 5;

export const SCOUT_CATEGORY_IDS: string[] = VENDOR_CATEGORIES.map((c) => c.id);

export type ScoutCandidate = {
  place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  price_level: string | null;
  website: string | null;
  already_tracked: boolean;
};

export type ScoutResult =
  | {
      location: string;
      category: string;
      /** Typical saved quote across First Look + this project's budget line. Estimates only. */
      market: {
        median_quote: number | null;
        quote_count: number;
        your_budget: number | null;
      };
      candidates: ScoutCandidate[];
      note: string;
    }
  | { needsLocation: true }
  | { error: string };

/** Search Google Places for wedding vendors in one canonical category. Read-only. */
export async function scoutVendors(
  supabase: SupabaseClient,
  projectId: string,
  input: { category?: unknown; near?: unknown },
): Promise<ScoutResult> {
  const categoryId =
    typeof input.category === "string" ? input.category.trim() : "";
  const category = getVendorCategoryById(categoryId);
  if (!category) {
    return {
      error: `category must be one of: ${SCOUT_CATEGORY_IDS.join(", ")}`,
    };
  }

  const nearRaw = typeof input.near === "string" ? input.near.trim() : "";
  const location =
    nearRaw || (await resolveProjectLocationHint(supabase, projectId));
  if (!location) return { needsLocation: true };

  const search = await placesTextSearch({
    textQuery: composeVendorTextQuery(category, location),
    maxResultCount: 20,
    includePureServiceAreaBusinesses: true,
    ...(category.includedType
      ? { includedType: category.includedType, strictTypeFiltering: true }
      : {}),
  });
  if (!search.ok) return { error: search.error };

  let places = search.places;
  if (category.includedType === null && category.deniedPrimaryTypes.length > 0) {
    const denied = new Set(category.deniedPrimaryTypes);
    places = places.filter(
      (place) => !place.primaryType || !denied.has(place.primaryType),
    );
  }

  // Already on this wedding (any status), so the model doesn't re-pitch them.
  const { data: tracked } = await supabase
    .from("vendors")
    .select("external_place_id, project_vendors!inner(project_id)")
    .eq("project_vendors.project_id", projectId)
    .not("external_place_id", "is", null);
  const trackedIds = new Set(
    (tracked ?? []).map((row) => row.external_place_id as string),
  );

  const market = await loadVendorMarketContext(
    projectId,
    category.id,
    category.label,
  );

  // Reviewed businesses first; Google's own order breaks ties.
  const ranked = [...places].sort((a, b) => {
    const aReviewed = (a.userRatingCount ?? 0) >= 5 ? 1 : 0;
    const bReviewed = (b.userRatingCount ?? 0) >= 5 ? 1 : 0;
    return bReviewed - aReviewed;
  });

  return {
    location,
    category: category.id,
    market: {
      median_quote: market.medianQuote,
      quote_count: market.quoteCount,
      your_budget: market.yourBudget,
    },
    candidates: ranked.slice(0, SCOUT_RESULT_CAP).map((place) => ({
      place_id: place.id,
      name: place.name,
      address: place.formattedAddress ?? null,
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      price_level: place.priceLevel ?? null,
      website: place.websiteUri ?? null,
      already_tracked: trackedIds.has(place.id),
    })),
    note: "Google Places gives ratings and a rough price level, not quotes. Never state a price as fact; say pricing is unknown until the vendor replies.",
  };
}

export type PlaceBasics = { id: string; name: string; website: string | null };

/**
 * Look a place up by id so the name and website come from Google, never from
 * the model. A made-up id 404s here and is rejected.
 */
export async function fetchPlaceBasics(
  placeId: string,
): Promise<PlaceBasics | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,displayName,websiteUri",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      id?: string;
      displayName?: { text?: string };
      websiteUri?: string;
    };
    const name = data.displayName?.text?.trim();
    if (!data.id || !name) return null;
    return { id: data.id, name, website: data.websiteUri?.trim() || null };
  } catch {
    return null;
  }
}
