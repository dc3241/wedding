import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveBusinessAccountId,
  resolvePersonalAccountId,
} from "@/lib/billing/resolve-account";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type SubscriptionSnapshot = {
  isActive: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  hasCustomer: boolean;
  /** True only when a real Stripe Subscription id is on the row (not local trials / seeded active). */
  hasSubscription: boolean;
};

export async function getSubscriptionForAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<SubscriptionSnapshot> {
  // Demo accounts have no subscriptions row — treat as entitled (no paywall).
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("is_demo")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (account?.is_demo) {
    return {
      isActive: true,
      status: "demo",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      priceId: null,
      hasCustomer: false,
      hasSubscription: false,
    };
  }

  const { data: row, error } = await supabase
    .from("subscriptions")
    .select(
      "status, current_period_end, cancel_at_period_end, price_id, stripe_customer_id, stripe_subscription_id",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!row) {
    return {
      isActive: false,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      priceId: null,
      hasCustomer: false,
      hasSubscription: false,
    };
  }

  const status = row.status ?? null;
  const now = new Date();
  const periodEndPassed =
    row.current_period_end !== null &&
    new Date(row.current_period_end) <= now;

  // Local planner trials write status=trialing with no Stripe object; expire
  // them by current_period_end. Real Stripe `active` rows are unchanged.
  const isActive =
    status !== null &&
    ACTIVE_STATUSES.has(status) &&
    !(status === "trialing" && periodEndPassed);

  return {
    isActive,
    status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    priceId: row.price_id,
    hasCustomer: Boolean(row.stripe_customer_id),
    hasSubscription: row.stripe_subscription_id !== null,
  };
}

export async function getCoupleSubscription(
  supabase: SupabaseClient,
): Promise<SubscriptionSnapshot & { accountId: string }> {
  const accountId = await resolvePersonalAccountId(supabase);
  const subscription = await getSubscriptionForAccount(supabase, accountId);
  return { ...subscription, accountId };
}

export async function getPlannerSubscription(
  supabase: SupabaseClient,
): Promise<SubscriptionSnapshot & { accountId: string }> {
  const accountId = await resolveBusinessAccountId(supabase);
  const subscription = await getSubscriptionForAccount(supabase, accountId);
  return { ...subscription, accountId };
}
