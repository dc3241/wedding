import "server-only";

export type BillingPlanKey = "couple" | "planner";
export type PlannerBillingInterval = "monthly" | "annual";
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
} as const;

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
