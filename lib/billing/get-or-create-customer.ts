import "server-only";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

function isStripeResourceMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "resource_missing"
  );
}

/**
 * True when the id exists and is not deleted in the current Stripe mode/account.
 * False for test/live mismatch, wrong account, or a deleted customer.
 */
async function stripeCustomerIsUsable(customerId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return !customer.deleted;
  } catch (err) {
    if (isStripeResourceMissing(err)) {
      return false;
    }
    throw err;
  }
}

/**
 * Ensure the account has a Stripe Customer id.
 * Never writes status / period / subscription fields — those are owned by
 * trial-start and the webhook sync path (PRICE-02 abandon-checkout safety).
 */
export async function getOrCreateStripeCustomer(
  accountId: string,
): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("account_id, stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (
    existing?.stripe_customer_id &&
    (await stripeCustomerIsUsable(existing.stripe_customer_id))
  ) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      account_id: accountId,
      user_id: user.id,
    },
  });

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  if (existing) {
    // Local trial, missing customer, or stale id (test/live / account switch).
    // Attach customer id only — do not touch status / period / subscription.
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        stripe_customer_id: customer.id,
        updated_at: now,
      })
      .eq("account_id", accountId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await admin.from("subscriptions").insert({
      account_id: accountId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: null,
      status: null,
      price_id: null,
      quantity: 1,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: now,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return customer.id;
}
