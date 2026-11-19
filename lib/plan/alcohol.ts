/**
 * MEDIA-04: wedding alcohol estimate. Standard bar rule of thumb: two
 * drinks per drinking guest in the first hour, one an hour after that.
 * A 750 ml bottle of wine pours about 5 glasses, a 750 ml bottle of
 * liquor about 16 shots (1.5 oz), and a bottle of sparkling about 6 flutes.
 */
export const BAR_TYPES = [
  { id: "full", label: "Full bar", mix: { wine: 0.5, beer: 0.2, liquor: 0.3 } },
  { id: "beer_wine", label: "Beer & wine", mix: { wine: 0.6, beer: 0.4, liquor: 0 } },
  { id: "wine", label: "Wine only", mix: { wine: 1, beer: 0, liquor: 0 } },
] as const;

export type BarTypeId = (typeof BAR_TYPES)[number]["id"];

export const DRINKER_LEVELS = [
  { id: "light", label: "Light", factor: 0.75 },
  { id: "average", label: "Average", factor: 1 },
  { id: "heavy", label: "Party crowd", factor: 1.25 },
] as const;

export type DrinkerLevelId = (typeof DRINKER_LEVELS)[number]["id"];

const GLASSES_PER_WINE_BOTTLE = 5;
const SHOTS_PER_LIQUOR_BOTTLE = 16;
const FLUTES_PER_SPARKLING_BOTTLE = 6;

export type AlcoholEstimate = {
  totalDrinks: number;
  wineBottles: number;
  wineCases: number;
  beers: number;
  beerCases: number;
  liquorBottles: number;
  sparklingBottles: number;
};

export function estimateAlcohol(input: {
  drinkingGuests: number;
  hours: number;
  bar: BarTypeId;
  level: DrinkerLevelId;
  toast: boolean;
}): AlcoholEstimate {
  const guests = Math.max(0, Math.round(input.drinkingGuests));
  const hours = Math.min(12, Math.max(1, input.hours));
  const bar = BAR_TYPES.find((b) => b.id === input.bar) ?? BAR_TYPES[0];
  const level = DRINKER_LEVELS.find((l) => l.id === input.level) ?? DRINKER_LEVELS[1];

  const perGuest = (2 + (hours - 1)) * level.factor;
  const totalDrinks = Math.ceil(guests * perGuest);

  const wineBottles = Math.ceil((totalDrinks * bar.mix.wine) / GLASSES_PER_WINE_BOTTLE);
  const beers = Math.ceil(totalDrinks * bar.mix.beer);
  const liquorBottles = Math.ceil((totalDrinks * bar.mix.liquor) / SHOTS_PER_LIQUOR_BOTTLE);
  const sparklingBottles = input.toast ? Math.ceil(guests / FLUTES_PER_SPARKLING_BOTTLE) : 0;

  return {
    totalDrinks,
    wineBottles,
    wineCases: Math.ceil(wineBottles / 12),
    beers,
    beerCases: Math.ceil(beers / 24),
    liquorBottles,
    sparklingBottles,
  };
}
