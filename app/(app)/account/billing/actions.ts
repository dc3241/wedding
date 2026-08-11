"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrCreateStripeCustomer } from "@/lib/billing/get-or-create-customer";
import {
  getPlannerPriceId,
  type PlannerBillingInterval,
} from "@/lib/billing/plans";
import {
  resolveBusinessAccountId,
  resolvePersonalAccountId,
} from "@/lib/billing/resolve-account";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

const BILLING_PATH = "/account/billing";
const TRIAL_ENDED_MESSAGE =
  "This trial has already ended or been charged.";

/** $7 first-week charge. The $92 day-7 amount is FINAL_CHARGE_CENTS in
 *  supabase/functions/charge-trial-balance — update BOTH if the $99 total changes. */
const TRIAL_WEEK_CENTS = 700;

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

/**
 * PRICE-03: one-time $7 trial-week Checkout (mode=payment).
 * Saves the card via setup_future_usage for the day-7 $92 charge (PRICE-04).
 */
export async function createCoupleCheckoutSession() {
  const supabase = await createClient();
  const accountId = await resolvePersonalAccountId(supabase);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const baseUrl = await billingBaseUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "First Look — Full Plan (trial week)" },
          unit_amount: TRIAL_WEEK_CENTS,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: {
        account_id: accountId,
        charge_stage: "trial_week",
      },
    },
    success_url: `${baseUrl}${BILLING_PATH}?status=success`,
    cancel_url: `${baseUrl}${BILLING_PATH}?status=cancelled`,
    metadata: {
      account_id: accountId,
      charge_stage: "trial_week",
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
 * PRICE-05: stop (or undo stopping) the day-7 $92 charge.
 * Does not refund the $7 — only flips cancel_at_period_end while the
 * local trial is still open. RPC can succeed with zero rows updated;
 * we re-read to surface that honestly.
 */
async function setCoupleTrialCancellation(cancel: boolean) {
  const supabase = await createClient();
  const accountId = await resolvePersonalAccountId(supabase);

  const { error } = await supabase.rpc("set_couple_trial_cancellation", {
    p_account_id: accountId,
    p_cancel: cancel,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: row, error: readError } = await supabase
    .from("subscriptions")
    .select(
      "cancel_at_period_end, status, current_period_end, stripe_subscription_id",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  const periodOpen =
    row?.current_period_end != null &&
    new Date(row.current_period_end) > new Date();
  const applied =
    row?.status === "trialing" &&
    row.stripe_subscription_id == null &&
    periodOpen &&
    row.cancel_at_period_end === cancel;

  if (!applied) {
    throw new Error(TRIAL_ENDED_MESSAGE);
  }

  revalidatePath(BILLING_PATH);
}

/** PRICE-05: cancel the upcoming $92 charge; access lasts through period end. */
export async function cancelCoupleTrial() {
  await setCoupleTrialCancellation(true);
}

/** PRICE-05: undo a cancel — day-7 charge will run again if still open. */
export async function resumeCoupleTrial() {
  await setCoupleTrialCancellation(false);
}

/**
 * PRICE-06: Stripe Customer Portal for planners with a real Subscription.
 * Uses the dashboard default Portal configuration (no configuration id).
 */
export async function createPlannerPortalSession() {
  const supabase = await createClient();
  const accountId = await resolveBusinessAccountId(supabase);

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("account_id", accountId)
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
