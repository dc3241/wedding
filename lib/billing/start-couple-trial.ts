"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountContext } from "@/lib/account-context";
import { resolvePersonalAccountId } from "@/lib/billing/resolve-account";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const TRIAL_DAYS = 7;

async function redirectAfterCoupleTrial(supabase: SupabaseClient) {
  const account = await getAccountContext(supabase);
  if (account?.singleProjectId) {
    redirect(
      await getCoupleDestinationPath(supabase, account.singleProjectId),
    );
  }
  redirect("/projects");
}

/**
 * PRICE-07: start a local-only couple trial (no Stripe objects).
 * Inserts status=trialing with both Stripe ids null; expiry is enforced
 * by getSubscriptionForAccount reading current_period_end.
 */
export async function startCoupleTrial() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const accountId = await resolvePersonalAccountId(supabase);

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("account_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  // Row already present (active trial, expired trial, paid, canceled, …) —
  // never reset the clock or overwrite. Button only renders when no row.
  if (existing) {
    await redirectAfterCoupleTrial(supabase);
  }

  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + TRIAL_DAYS);

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("subscriptions").insert({
    account_id: accountId,
    status: "trialing",
    current_period_end: periodEnd.toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    price_id: null,
    quantity: 1,
    cancel_at_period_end: false,
    updated_at: now,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  await redirectAfterCoupleTrial(supabase);
}
