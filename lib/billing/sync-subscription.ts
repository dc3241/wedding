import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type SubscriptionUpsert = {
  account_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  status?: string | null;
  price_id?: string | null;
  quantity?: number;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

export async function resolveBillingAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data: businessMembership, error: businessError } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("accounts.kind", "business")
    .limit(1)
    .maybeSingle();

  if (businessError) {
    throw new Error(businessError.message);
  }

  if (businessMembership) {
    return businessMembership.account_id;
  }

  const { data: personalMembership, error: personalError } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("accounts.kind", "personal")
    .limit(1)
    .maybeSingle();

  if (personalError || !personalMembership) {
    throw new Error("No billing account found.");
  }

  return personalMembership.account_id;
}

export async function upsertSubscriptionRow(
  row: SubscriptionUpsert,
): Promise<void> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  const { error } = await admin.from("subscriptions").upsert(
    {
      account_id: row.account_id,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      status: row.status ?? null,
      price_id: row.price_id ?? null,
      quantity: row.quantity ?? 1,
      current_period_end: row.current_period_end ?? null,
      cancel_at_period_end: row.cancel_at_period_end ?? false,
      updated_at: now,
    },
    { onConflict: "account_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function resolveAccountIdForCustomer(
  customerId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("account_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (existing?.account_id) {
    return existing.account_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    return null;
  }

  return customer.metadata?.account_id ?? null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (!periodEnd) return null;
  return new Date(periodEnd * 1000).toISOString();
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

function subscriptionQuantity(subscription: Stripe.Subscription): number {
  return subscription.items.data[0]?.quantity ?? 1;
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const accountId = await resolveAccountIdForCustomer(customerId);
  if (!accountId) {
    return;
  }

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: subscriptionPriceId(subscription),
    quantity: subscriptionQuantity(subscription),
    current_period_end: subscriptionPeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
}

export async function syncSubscriptionById(
  subscriptionId: string,
): Promise<void> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionFromStripe(subscription);
}

export async function markSubscriptionCanceled(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const accountId = await resolveAccountIdForCustomer(customerId);
  if (!accountId) {
    return;
  }

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: subscriptionPriceId(subscription),
    quantity: subscriptionQuantity(subscription),
    current_period_end: subscriptionPeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
}
