/**
 * MEDIA-04: wedding cost estimate. These are planning rules of thumb, not
 * survey data, and the page says so. Local prices vary a lot.
 */
export const COST_STYLES = [
  { id: "simple", label: "Simple", note: "Casual venue, buffet, small extras", perGuest: [150, 250] },
  { id: "classic", label: "Classic", note: "Full-service venue, plated or stations, photographer + DJ", perGuest: [250, 400] },
  { id: "luxe", label: "Luxe", note: "Premium venue, full bar, planner, band, florals throughout", perGuest: [400, 700] },
] as const;

export type CostStyleId = (typeof COST_STYLES)[number]["id"];

/** Typical share of the total. Adds up to 100. */
export const COST_SPLIT = [
  { label: "Venue & catering", pct: 45 },
  { label: "Photography & video", pct: 12 },
  { label: "Flowers & decor", pct: 9 },
  { label: "Attire & beauty", pct: 8 },
  { label: "Music & entertainment", pct: 7 },
  { label: "Planner or coordinator", pct: 5 },
  { label: "Rentals & transportation", pct: 4 },
  { label: "Stationery & favors", pct: 3 },
  { label: "Cake & desserts", pct: 2 },
  { label: "Cushion for surprises", pct: 5 },
] as const;

export type CostEstimate = {
  low: number;
  high: number;
  /** What the split is based on: the couple's own budget, or the midpoint. */
  basis: number;
  basisIsBudget: boolean;
  perGuestAtBudget: number | null;
  split: { label: string; pct: number; amount: number }[];
};

/** Round to a friendly number: nearest $10 under $1k, nearest $100 above. */
export function roundMoney(n: number): number {
  return n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 100) * 100;
}

export function estimateWeddingCost(
  guests: number,
  style: CostStyleId,
  budget: number | null,
): CostEstimate {
  const g = Math.max(1, Math.round(guests));
  const s = COST_STYLES.find((x) => x.id === style) ?? COST_STYLES[1];
  const low = roundMoney(g * s.perGuest[0]);
  const high = roundMoney(g * s.perGuest[1]);
  const basisIsBudget = budget != null && budget > 0;
  const basis = basisIsBudget ? budget : roundMoney((low + high) / 2);
  return {
    low,
    high,
    basis,
    basisIsBudget,
    perGuestAtBudget: basisIsBudget ? Math.round(budget / g) : null,
    split: COST_SPLIT.map((c) => ({ ...c, amount: roundMoney((basis * c.pct) / 100) })),
  };
}

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
