import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getCouplePriceId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type SubscriptionUpsert = {
  account_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  stripe_payment_method_id?: string | null;
  status?: string | null;
  price_id?: string | null;
  quantity?: number;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

export async function resolveBillingAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No billing account found.");
  }

  // Scope to the caller's row — fellow-member SELECT (TEAM-01).
  const { data: businessMembership, error: businessError } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("user_id", user.id)
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
    .eq("user_id", user.id)
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

  const payload: Record<string, unknown> = {
    account_id: row.account_id,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    status: row.status ?? null,
    price_id: row.price_id ?? null,
    quantity: row.quantity ?? 1,
    current_period_end: row.current_period_end ?? null,
    cancel_at_period_end: row.cancel_at_period_end ?? false,
    updated_at: now,
  };

  // Only set when provided — planner subscription sync must not null a
  // couple's saved payment method (and vice versa leave planners alone).
  if (row.stripe_payment_method_id !== undefined) {
    payload.stripe_payment_method_id = row.stripe_payment_method_id;
  }

  const { error } = await admin.from("subscriptions").upsert(payload, {
    onConflict: "account_id",
  });

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

/**
 * VENUE-02 / VENUE-02b: flip accounts.plan from the live subscription price.
 * Additive — only runs when price_id is in the venue monthly/annual set.
 * Fail-closed: only active/trialing → 'venue'; every other known status
 * → 'planner'. Unrecognized statuses → 'planner' + warn (do not grant
 * venue by default).
 * Idempotent. Does not touch white_label_enabled or brand columns.
 * CHECK failures (e.g. personal account) must propagate — do not swallow.
 */
async function applyVenuePlanFromSubscription(
  accountId: string,
  priceId: string | null,
  status: string | null | undefined,
): Promise<void> {
  const venuePriceIds = new Set(
    [
      process.env.STRIPE_PRICE_VENUE_MONTHLY,
      process.env.STRIPE_PRICE_VENUE_ANNUAL,
    ].filter((id): id is string => Boolean(id)),
  );
  if (!priceId || venuePriceIds.size === 0 || !venuePriceIds.has(priceId)) {
    return;
  }

  // Venue Checkout has no trial_period_days today (PRICE-02 parity) —
  // 'trialing' is mapped for correctness but currently unreachable.
  let plan: "venue" | "planner";
  switch (status) {
    case "active":
    case "trialing":
      plan = "venue";
      break;
    case "canceled":
    case "incomplete_expired":
    case "incomplete":
    case "unpaid":
    case "past_due":
    case "paused":
      plan = "planner";
      break;
    default:
      console.warn(
        "VENUE-02: unrecognized Stripe subscription status; setting plan=planner",
        { accountId, priceId, status },
      );
      plan = "planner";
      break;
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("accounts")
    .update({ plan })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }
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

  const priceId = subscriptionPriceId(subscription);

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: priceId,
    quantity: subscriptionQuantity(subscription),
    current_period_end: subscriptionPeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  await applyVenuePlanFromSubscription(
    accountId,
    priceId,
    subscription.status,
  );
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

  const priceId = subscriptionPriceId(subscription);

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: priceId,
    quantity: subscriptionQuantity(subscription),
    current_period_end: subscriptionPeriodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  await applyVenuePlanFromSubscription(
    accountId,
    priceId,
    subscription.status,
  );
}

function sessionCustomerId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.customer === "string") {
    return session.customer;
  }
  if (session.customer && !session.customer.deleted) {
    return session.customer.id;
  }
  return null;
}

function sessionSubscriptionId(
  session: Stripe.Checkout.Session,
): string | null {
  if (!session.subscription) return null;
  return typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
}

/**
 * PRICE-08: one-time $99 couple lifetime. No Stripe Subscription object.
 * Shared by the webhook and Checkout-return reconciliation.
 */
async function applyCoupleLifetimeFromCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const accountId = session.metadata?.account_id;
  if (!accountId) {
    console.error(
      "Stripe checkout.session.completed (couple_lifetime): missing account_id metadata.",
    );
    return;
  }

  const customerId = sessionCustomerId(session);
  if (!customerId) {
    console.error(
      "Stripe checkout.session.completed (couple_lifetime): missing customer.",
      { accountId },
    );
    return;
  }

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    status: "active",
    price_id: getCouplePriceId("lifetime"),
    current_period_end: null,
    cancel_at_period_end: false,
  });
}

/**
 * Shared Checkout.session.completed writer. Webhook is the primary caller;
 * Checkout-return reconciliation is the fallback for a missed webhook.
 */
export async function applyCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode === "payment") {
    if (session.metadata?.charge_stage !== "couple_lifetime") {
      return;
    }
    await applyCoupleLifetimeFromCheckout(session);
    return;
  }

  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }

  const subscriptionId = sessionSubscriptionId(session);
  if (!subscriptionId) {
    return;
  }

  await syncSubscriptionById(subscriptionId);
}

function checkoutAlreadyApplied(
  row: {
    status: string | null;
    price_id: string | null;
    stripe_subscription_id: string | null;
  } | null,
  session: Stripe.Checkout.Session,
): boolean {
  if (!row) return false;

  if (session.mode === "payment") {
    if (session.metadata?.charge_stage !== "couple_lifetime") {
      return false;
    }
    return (
      row.status === "active" &&
      row.price_id === getCouplePriceId("lifetime")
    );
  }

  if (session.mode !== "subscription") {
    return false;
  }

  const subscriptionId = sessionSubscriptionId(session);
  // Match THIS checkout's subscription — a prior local trial (status=trialing,
  // price_id null) or planner row (different stripe_subscription_id) is not
  // "already applied."
  return (
    Boolean(subscriptionId) &&
    row.stripe_subscription_id === subscriptionId &&
    row.status !== null &&
    row.price_id !== null
  );
}

/**
 * CHECKOUT-RECONCILE-01: synchronous fallback on the Checkout return page.
 * Does not replace the webhook for renewals / cancellations / failures.
 * No-ops when the webhook already wrote this session's result.
 */
export async function reconcileCheckoutReturn(
  accountId: string,
  params: { status?: string; session_id?: string },
): Promise<void> {
  if (params.status !== "success" || !params.session_id) {
    return;
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(params.session_id, {
      expand: ["subscription"],
    });

    if (session.status !== "complete") {
      return;
    }

    if (session.metadata?.account_id !== accountId) {
      console.error(
        "CHECKOUT-RECONCILE-01: session metadata account_id does not match authenticated account.",
        { accountId },
      );
      return;
    }

    const customerId = sessionCustomerId(session);
    if (!customerId) {
      console.error(
        "CHECKOUT-RECONCILE-01: session has no customer.",
        { accountId },
      );
      return;
    }

    const admin = createServiceRoleClient();
    const { data: row, error } = await admin
      .from("subscriptions")
      .select("status, price_id, stripe_subscription_id, stripe_customer_id")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (
      row?.stripe_customer_id &&
      row.stripe_customer_id !== customerId
    ) {
      console.error(
        "CHECKOUT-RECONCILE-01: session customer does not match account.",
        { accountId },
      );
      return;
    }

    if (checkoutAlreadyApplied(row, session)) {
      return;
    }

    await applyCheckoutSession(session);
  } catch (err) {
    console.error("CHECKOUT-RECONCILE-01: failed to reconcile checkout session", err);
  }
}
