/**
 * COUPLES-PIVOT part 3 — assistant spend caps (model cost, micro-dollars).
 *
 * Target: >= 50% gross margin on every plan even at full cap usage.
 * Model cost is metered per run (chat + weekly digest + daily notes +
 * outreach drafts) in assistant_usage at Anthropic list price.
 *
 *  Monthly  $19.99 - Stripe (2.9% + $0.30 = $0.88)        = $19.11 net
 *           cap $7.50 / calendar month (UTC)               -> 60.8% margin at cap
 *  Lifetime $99    - Stripe (2.9% + $0.30 = $3.17)         = $95.83 net
 *           cap $7.50 / month AND $45 for the account's
 *           whole life                                     -> 53.0% margin at cap
 *  Trial    no revenue; $1.50 over the 7 days (acquisition cost)
 *
 * What $7.50 buys (Sonnet 4.6, prompt-cached system prompt): a chat turn is
 * ~2–3 model calls, roughly $0.04–$0.07. The agent crons run about $1.50 a
 * month per wedding. That leaves ~90–140 assistant messages a month, far
 * above what a planning couple sends, so the cap is a backstop, not a
 * daily limit. Infra (Supabase/Vercel/Resend) is a few cents per couple and
 * fits inside the remaining margin.
 *
 * Client-safe: no server imports.
 */
export const ASSISTANT_TRIAL_DAYS = 7;

export const ASSISTANT_CAP_MICROS = {
  trialTotal: 1_500_000,
  monthly: 7_500_000,
  lifetimeMonthly: 7_500_000,
  lifetimeTotal: 45_000_000,
} as const;

export type AssistantPlan = "trial" | "monthly" | "lifetime" | "demo" | "business";

export type AssistantLockReason =
  /** Never used the assistant: the first message starts the 7-day trial. */
  | "trial_available"
  /** Trial over / subscription lapsed or canceled. */
  | "upgrade_required"
  /** This period's spend cap is used up. */
  | "limit_reached";

/** What the UI needs: never dollar amounts, only a percent and dates. */
export type AssistantAccessSummary = {
  allowed: boolean;
  plan: AssistantPlan | null;
  lockReason: AssistantLockReason | null;
  /** 0–100, rounded. Null for uncapped plans. */
  usedPercent: number | null;
  /** ISO — trial end, or when the monthly allowance resets. */
  trialEndsAt: string | null;
  resetsAt: string | null;
  /** True when the viewer is a member of the paying account (can upgrade). */
  canUpgrade: boolean;
};
