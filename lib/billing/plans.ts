import "server-only";

export type BillingPlanKey = "couple" | "planner" | "venue";
export type PlannerBillingInterval = "monthly" | "annual";
export type VenueBillingInterval = "monthly" | "annual";
export type CoupleBillingPlan = "monthly" | "lifetime";

export const BILLING_PLANS = {
  couple: {
    label: "Couple",
    monthly: {
      priceId: process.env.STRIPE_PRICE_COUPLE_MONTHLY ?? "",
      label: "Monthly",
      amountLabel: "$10/mo",
    },
    lifetime: {
      priceId: process.env.STRIPE_PRICE_COUPLE_LIFETIME ?? "",
      label: "Lifetime",
      amountLabel: "$99",
    },
  },
  planner: {
    label: "Planner",
    monthly: {
      priceId: process.env.STRIPE_PRICE_PLANNER_MONTHLY ?? "",
      label: "Monthly",
      amountLabel: "$59/mo",
    },
    annual: {
      priceId: process.env.STRIPE_PRICE_PLANNER_ANNUAL ?? "",
      label: "Annual",
      amountLabel: "$590/yr",
    },
  },
  // VENUE-02b: monthly + annual; Dom sets Stripe Price ids in Dashboard.
  venue: {
    label: "Venue",
    monthly: {
      priceId: process.env.STRIPE_PRICE_VENUE_MONTHLY ?? "",
      label: "Monthly",
      amountLabel: "$199/mo",
    },
    annual: {
      priceId: process.env.STRIPE_PRICE_VENUE_ANNUAL ?? "",
      label: "Annual",
      amountLabel: "$1,999/yr",
    },
  },
} as const;

/** $199*12 − $1,999 — display only; Checkout uses Stripe Price ids. */
export const VENUE_ANNUAL_SAVINGS = 400;

export function getPlannerPriceId(interval: PlannerBillingInterval): string {
  const priceId = BILLING_PLANS.planner[interval].priceId;
  if (!priceId) {
    throw new Error(`Missing price ID for planner ${interval}`);
  }
  return priceId;
}

export function getCouplePriceId(plan: CoupleBillingPlan): string {
  const priceId = BILLING_PLANS.couple[plan].priceId;
  if (!priceId) {
    throw new Error(`Missing price ID for couple ${plan}`);
  }
  return priceId;
}

export function getVenuePriceId(interval: VenueBillingInterval): string {
  const priceId = BILLING_PLANS.venue[interval].priceId;
  if (!priceId) {
    throw new Error(`Missing price ID for venue ${interval}`);
  }
  return priceId;
}

/** Both venue Stripe price ids that flip accounts.plan (membership gate). */
export function getVenuePriceIds(): string[] {
  return [BILLING_PLANS.venue.monthly.priceId, BILLING_PLANS.venue.annual.priceId].filter(
    (id) => id.length > 0,
  );
}
