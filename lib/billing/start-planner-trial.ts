"use server";

import { redirect } from "next/navigation";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const TRIAL_DAYS = 7;

/**
 * PRICE-01: start a local-only planner trial (no Stripe objects).
 * Inserts status=trialing, or updates a Checkout-initiation stub
 * (status null) in place. Expiry is enforced by getSubscriptionForAccount
 * reading current_period_end.
 */
export async function startPlannerTrial() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountId = await resolveBusinessAccountId(supabase);

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("account_id, status")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  // Real rows (paid, lapsed, previously-trialing, canceled, …) must never
  // be overwritten. A Checkout-initiation stub (status null, customer id
  // only) is not a real subscription — convert it in place.
  if (existing && existing.status !== null) {
    redirect("/dashboard");
  }

  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + TRIAL_DAYS);

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const trialFields = {
    status: "trialing",
    current_period_end: periodEnd.toISOString(),
    stripe_subscription_id: null,
    price_id: null,
    quantity: 1,
    cancel_at_period_end: false,
    updated_at: now,
  };

  if (existing) {
    const { error: updateError } = await admin
      .from("subscriptions")
      .update(trialFields)
      .eq("account_id", accountId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await admin.from("subscriptions").insert({
      account_id: accountId,
      stripe_customer_id: null,
      ...trialFields,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  redirect("/dashboard");
}
