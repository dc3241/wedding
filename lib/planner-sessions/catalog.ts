/**
 * PLANNER-HELP-01 — "Talk to a planner" offers. Client-safe (no server-only
 * import) so the couple page and billing card can render prices.
 *
 * Checkout uses inline `price_data` built from these values, so no Stripe
 * Dashboard Price is required. To use a Dashboard Price instead (e.g. for
 * reporting), set the matching STRIPE_PRICE_PLANNER_* env var — see
 * lib/planner-sessions/checkout.ts.
 */

export type PlannerSessionKind = "quick" | "full";

export type PlannerOfferId =
  | "quick"
  | "single"
  | "pack_3"
  | "final_stretch"
  | "monthly";

export type PlannerOffer = {
  id: PlannerOfferId;
  name: string;
  priceCents: number;
  priceLabel: string;
  /** Shown under the price. */
  cadence: string;
  sessionKind: PlannerSessionKind;
  /** Credits granted per purchase (or per paid month for `monthly`). */
  credits: number;
  /** Days until the credits expire. Monthly credits expire at period end. */
  validDays: number | null;
  recurring: boolean;
  summary: string;
  bullets: string[];
};

export const SESSION_MINUTES: Record<PlannerSessionKind, number> = {
  quick: 30,
  full: 60,
};

export const PLANNER_OFFERS: PlannerOffer[] = [
  {
    id: "quick",
    name: "Quick question",
    priceCents: 4900,
    priceLabel: "$49",
    cadence: "one 30-minute call",
    sessionKind: "quick",
    credits: 1,
    validDays: 180,
    recurring: false,
    summary: "One focused problem, talked through with a real planner.",
    bullets: ["30-minute Zoom", "Written recap after the call"],
  },
  {
    id: "single",
    name: "Full session",
    priceCents: 9900,
    priceLabel: "$99",
    cadence: "one 60-minute call",
    sessionKind: "full",
    credits: 1,
    validDays: 180,
    recurring: false,
    summary: "Room to work through a contract, budget, or timeline together.",
    bullets: [
      "60-minute Zoom",
      "Planner reviews your workspace beforehand",
      "Written recap after the call",
    ],
  },
  {
    id: "pack_3",
    name: "3-session pack",
    priceCents: 26900,
    priceLabel: "$269",
    cadence: "three 60-minute calls · about $90 each",
    sessionKind: "full",
    credits: 3,
    validDays: 180,
    recurring: false,
    summary: "Check in at the big milestones without paying full price each time.",
    bullets: ["Three 60-minute calls", "Use within 6 months", "Recap after every call"],
  },
  {
    id: "monthly",
    name: "Monthly support",
    priceCents: 17900,
    priceLabel: "$179",
    cadence: "per month · cancel anytime",
    sessionKind: "full",
    credits: 2,
    validDays: null,
    recurring: true,
    summary: "Two calls every month for couples who want a planner in their corner.",
    bullets: [
      "Two 60-minute calls each month",
      "Priority scheduling",
      "Unused calls don't roll over",
    ],
  },
  {
    id: "final_stretch",
    name: "Final stretch",
    priceCents: 39900,
    priceLabel: "$399",
    cadence: "four 60-minute calls · last 90 days",
    sessionKind: "full",
    credits: 4,
    validDays: 120,
    recurring: false,
    summary: "For the last three months, when everything lands at once.",
    bullets: [
      "Four 60-minute calls",
      "Day-of timeline review",
      "Use within 120 days",
    ],
  },
];

export function getPlannerOffer(id: string): PlannerOffer | null {
  return PLANNER_OFFERS.find((offer) => offer.id === id) ?? null;
}

export function isPlannerOfferId(value: unknown): value is PlannerOfferId {
  return typeof value === "string" && getPlannerOffer(value) !== null;
}

/** Checkout metadata marker. Billing sync ignores anything carrying it. */
export const PLANNER_CHECKOUT_PURPOSE = "planner_session";
export const PLANNER_SUPPORT_PURPOSE = "planner_support";

export const PLANNER_SESSION_RULES = [
  "Calls are capped at their length — overtime is billed as a new session.",
  "Reschedule or cancel at least 24 hours ahead, or the call counts as used.",
  "Unused sessions expire; monthly sessions don't roll over.",
  "Tell us your question when you book so the planner can prepare.",
];
