/** Seed venue_type strings are free text ("farm/barn", "historic estate"). Map to a few filter buckets. */
export const VENUE_STYLES = [
  "Barn",
  "Farm & ranch",
  "Estate & mansion",
  "Garden",
  "Vineyard & winery",
  "Historic",
] as const;

export type VenueStyle = (typeof VENUE_STYLES)[number];

const RULES: readonly [VenueStyle, RegExp][] = [
  ["Barn", /barn/],
  ["Farm & ranch", /farm|ranch|orchard|hacienda|equestrian|horse/],
  ["Estate & mansion", /estate|mansion|manor|castle|villa|plantation/],
  ["Garden", /garden|botanical/],
  ["Vineyard & winery", /vineyard|winery/],
  ["Historic", /historic|mill|museum|living history/],
];

export function venueStyles(venueType: string | null): VenueStyle[] {
  const t = (venueType ?? "").toLowerCase();
  return RULES.filter(([, re]) => re.test(t)).map(([style]) => style);
}
