"use server";

import { getListingsByState } from "@/lib/directory/data";
import { stateByCode } from "@/lib/directory/states";
import { VENUE_STYLES, venueStyles, type VenueStyle } from "@/lib/directory/venue-style";

export type VenueMatch = {
  slug: string;
  name: string;
  city: string | null;
  styles: VenueStyle[];
  verified: boolean;
};

export type VenueMatchResult = {
  stateName: string;
  stateSlug: string;
  totalInState: number;
  /** false when nothing matched the styles and we fell back to all venues. */
  matchedStyle: boolean;
  matches: VenueMatch[];
};

const MAX_RESULTS = 9;

/** MEDIA-03: public read via the directory's anon definer RPC. */
export async function findVenueMatches(
  stateCode: string,
  styles: readonly string[],
): Promise<VenueMatchResult | null> {
  const state = stateByCode(stateCode);
  if (!state) return null;

  const wanted = styles.filter((s): s is VenueStyle =>
    (VENUE_STYLES as readonly string[]).includes(s),
  );
  const listings = await getListingsByState(state.code, "venue");
  const toMatch = (l: (typeof listings)[number]): VenueMatch => ({
    slug: l.slug,
    name: l.name,
    city: l.city,
    styles: venueStyles(l.venue_type),
    verified: l.verified,
  });

  const all = listings.map(toMatch);
  // Most matching styles first, then verified, then the directory's own order.
  const scored = wanted.length
    ? all
        .map((m) => ({ m, score: m.styles.filter((s) => wanted.includes(s)).length }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || Number(b.m.verified) - Number(a.m.verified))
        .map((x) => x.m)
    : all;

  const matchedStyle = scored.length > 0;
  return {
    stateName: state.name,
    stateSlug: state.slug,
    totalInState: all.length,
    matchedStyle,
    matches: (matchedStyle ? scored : all).slice(0, MAX_RESULTS),
  };
}
