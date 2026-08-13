"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account-context";
import { getOrCreateStripeCustomer } from "@/lib/billing/get-or-create-customer";
import {
  getCouplePriceId,
  getPlannerPriceId,
  getVenuePriceId,
  type CoupleBillingPlan,
  type PlannerBillingInterval,
  type VenueBillingInterval,
} from "@/lib/billing/plans";
import {
  resolveBusinessAccountId,
  resolvePersonalAccountId,
} from "@/lib/billing/resolve-account";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

const BILLING_PATH = "/account/billing";
const VENUE_UPGRADE_PATH = "/account/venue-upgrade";

async function billingBaseUrl() {
  const headersList = await headers();
  return headersList.get("origin") ?? "http://localhost:3000";
}

function parsePlannerInterval(
  value: FormDataEntryValue | null,
): PlannerBillingInterval {
  if (value === "monthly" || value === "annual") {
    return value;
  }
  throw new Error("Choose Monthly or Annual.");
}

function parseVenueInterval(
  value: FormDataEntryValue | null,
): VenueBillingInterval {
  if (value === "monthly" || value === "annual") {
    return value;
  }
  throw new Error("Choose Monthly or Annual.");
}

function parseCouplePlan(
  value: FormDataEntryValue | null,
): CoupleBillingPlan {
  if (value === "monthly" || value === "lifetime") {
    return value;
  }
  throw new Error("Choose Monthly or Lifetime.");
}

/**
 * PRICE-08: couple paid Checkout — Monthly ($10/mo subscription) or
 * Lifetime ($99 one-time). No trial_period_days; PRICE-07 owns the free window.
 */
export async function createCoupleCheckoutSession(formData: FormData) {
  const plan = parseCouplePlan(formData.get("plan"));
  const supabase = await createClient();
  const accountId = await resolvePersonalAccountId(supabase);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const priceId = getCouplePriceId(plan);
  const baseUrl = await billingBaseUrl();
  const stripe = getStripe();

  const session =
    plan === "monthly"
      ? await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${baseUrl}${BILLING_PATH}?status=success`,
          cancel_url: `${baseUrl}${BILLING_PATH}?status=cancelled`,
          metadata: {
            account_id: accountId,
          },
          subscription_data: {
            metadata: {
              account_id: accountId,
            },
          },
        })
      : await stripe.checkout.sessions.create({
          mode: "payment",
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          payment_intent_data: {
            metadata: {
              account_id: accountId,
              charge_stage: "couple_lifetime",
            },
          },
          success_url: `${baseUrl}${BILLING_PATH}?status=success`,
          cancel_url: `${baseUrl}${BILLING_PATH}?status=cancelled`,
          metadata: {
            account_id: accountId,
            charge_stage: "couple_lifetime",
          },
        });

  if (!session.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(session.url);
}

/**
 * PRICE-02: paid planner checkout (Monthly / Annual).
 * No trial_period_days — PRICE-01 already covers the free local trial.
 */
export async function createPlannerCheckoutSession(formData: FormData) {
  const interval = parsePlannerInterval(formData.get("interval"));
  const supabase = await createClient();
  const accountId = await resolveBusinessAccountId(supabase);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const priceId = getPlannerPriceId(interval);
  const baseUrl = await billingBaseUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${BILLING_PATH}?status=success`,
    cancel_url: `${baseUrl}${BILLING_PATH}?status=cancelled`,
    metadata: {
      account_id: accountId,
      planner_interval: interval,
    },
    subscription_data: {
      metadata: {
        account_id: accountId,
        planner_interval: interval,
      },
    },
  });

  if (!session.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(session.url);
}

/**
 * VENUE-02 / VENUE-02b: paid venue Checkout (Monthly / Annual).
 * No trial_period_days — same posture as PRICE-02.
 * /account/venue-upgrade is the primary caller.
 */
export async function createVenueCheckoutSession(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) {
    throw new Error("Account is required.");
  }

  const interval = parseVenueInterval(formData.get("interval"));

  const supabase = await createClient();
  const businessAccountId = await resolveBusinessAccountId(supabase);

  if (accountId !== businessAccountId) {
    throw new Error("Account mismatch.");
  }

  const customerId = await getOrCreateStripeCustomer(accountId);
  const priceId = getVenuePriceId(interval);
  const baseUrl = await billingBaseUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${VENUE_UPGRADE_PATH}?status=success`,
    cancel_url: `${baseUrl}${VENUE_UPGRADE_PATH}?status=cancelled`,
    metadata: {
      account_id: accountId,
      plan: "venue",
      venue_interval: interval,
    },
    subscription_data: {
      metadata: {
        account_id: accountId,
        plan: "venue",
        venue_interval: interval,
      },
    },
  });

  if (!session.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(session.url);
}

/**
 * PRICE-06 / PRICE-08: Stripe Customer Portal for any account with a
 * real Stripe Customer. Uses the dashboard default Portal configuration.
 */
export async function createPortalSession() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    throw new Error("No billing account found.");
  }

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", account.accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!subscription?.stripe_customer_id) {
    throw new Error("No billing customer found.");
  }

  const baseUrl = await billingBaseUrl();
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${baseUrl}${BILLING_PATH}`,
  });

  redirect(session.url);
}
