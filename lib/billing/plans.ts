import "server-only";

export type BillingPlanKey = "couple" | "planner";

export const BILLING_PLANS: Record<
  BillingPlanKey,
  { priceId: string; label: string }
> = {
  couple: {
    priceId: process.env.STRIPE_PRICE_COUPLE ?? "",
    label: "Couple",
  },
  planner: {
    priceId: process.env.STRIPE_PRICE_PLANNER ?? "",
    label: "Planner",
  },
};

export function getPlanPriceId(plan: BillingPlanKey): string {
  const priceId = BILLING_PLANS[plan].priceId;
  if (!priceId) {
    throw new Error(`Missing price ID for plan: ${plan}`);
  }
  return priceId;
}
