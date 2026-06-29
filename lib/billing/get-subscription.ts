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
};

export async function getSubscriptionForAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<SubscriptionSnapshot> {
  const { data: row, error } = await supabase
    .from("subscriptions")
    .select(
      "status, current_period_end, cancel_at_period_end, price_id, stripe_customer_id",
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
    };
  }

  const status = row.status ?? null;

  return {
    isActive: status !== null && ACTIVE_STATUSES.has(status),
    status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    priceId: row.price_id,
    hasCustomer: Boolean(row.stripe_customer_id),
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
