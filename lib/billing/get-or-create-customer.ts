import "server-only";
import { getStripe } from "@/lib/stripe";
import { upsertSubscriptionRow } from "@/lib/billing/sync-subscription";
import { createClient } from "@/utils/supabase/server";

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
    .select("stripe_customer_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.stripe_customer_id) {
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

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customer.id,
    status: null,
    stripe_subscription_id: null,
    price_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
  });

  return customer.id;
}
