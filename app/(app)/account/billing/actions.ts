"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrCreateStripeCustomer } from "@/lib/billing/get-or-create-customer";
import { getPlanPriceId } from "@/lib/billing/plans";
import {
  resolveBusinessAccountId,
  resolvePersonalAccountId,
} from "@/lib/billing/resolve-account";
import { getAccountContext } from "@/lib/account-context";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

const BILLING_PATH = "/account/billing";

async function billingBaseUrl() {
  const headersList = await headers();
  return headersList.get("origin") ?? "http://localhost:3000";
}

async function createCheckoutSession(
  accountId: string,
  plan: "couple" | "planner",
) {
  const customerId = await getOrCreateStripeCustomer(accountId);
  const priceId = getPlanPriceId(plan);
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
    },
    subscription_data: {
      metadata: {
        account_id: accountId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(session.url);
}

export async function createCoupleCheckoutSession() {
  const supabase = await createClient();
  const accountId = await resolvePersonalAccountId(supabase);
  await createCheckoutSession(accountId, "couple");
}

export async function createPlannerCheckoutSession() {
  const supabase = await createClient();
  const accountId = await resolveBusinessAccountId(supabase);
  await createCheckoutSession(accountId, "planner");
}

export async function createBillingPortalSession() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    throw new Error("Not authenticated.");
  }

  const accountId =
    account.kind === "business"
      ? await resolveBusinessAccountId(supabase)
      : await resolvePersonalAccountId(supabase);

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
