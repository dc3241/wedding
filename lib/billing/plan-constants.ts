export type BillingPlanKey = "couple" | "planner" | "venue";
export type PlannerBillingInterval = "monthly" | "annual";
export type VenueBillingInterval = "monthly" | "annual";
export type CoupleBillingPlan = "monthly" | "lifetime";

/** $199*12 − $1,799 — display only; Checkout uses Stripe Price ids. */
export const VENUE_ANNUAL_SAVINGS = 589;
