// supabase/functions/charge-trial-balance/index.ts
// PRICE-04 — day-7 $92 off-session charge for couple trial weeks.
// Dom deploys + schedules this manually (pg_cron is not enabled).
//
// Counterpart to TRIAL_WEEK_CENTS (700) in
// app/(app)/account/billing/actions.ts — if the $99 total ever
// changes, update BOTH constants by hand (separate runtimes).
//
// Deploy:
//   supabase functions deploy charge-trial-balance --no-verify-jwt
//
// Secrets (Dashboard → Edge Functions → charge-trial-balance → Secrets):
//   STRIPE_SECRET_KEY  (same test/live key as the Next app)
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by platform)
//
// Schedule (Dashboard → Edge Functions → charge-trial-balance → Schedules), hourly:
//   cron: 0 * * * *
//
// Or invoke once (service role JWT as Bearer):
//   curl -X POST "$SUPABASE_URL/functions/v1/charge-trial-balance" \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** $92 remainder after the $7 trial week ($99 total). See TRIAL_WEEK_CENTS in Next. */
const FINAL_CHARGE_CENTS = 9200;

type ClaimedRow = {
  account_id: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
};

async function createOffSessionPaymentIntent(args: {
  stripeSecretKey: string;
  amount: number;
  customerId: string;
  paymentMethodId: string;
  accountId: string;
}): Promise<void> {
  const body = new URLSearchParams({
    amount: String(args.amount),
    currency: "usd",
    customer: args.customerId,
    payment_method: args.paymentMethodId,
    off_session: "true",
    confirm: "true",
    "metadata[account_id]": args.accountId,
    "metadata[charge_stage]": "trial_final",
  });

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json?.error?.message ?? `stripe_payment_intent_${res.status}`,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "method_not_allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_supabase_env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_stripe_secret" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Require service-role bearer so the function is not a public charge endpoint.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const claim = await supabase.rpc("claim_couple_trial_charges");
  if (claim.error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "claim_failed",
        detail: claim.error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const rows = (claim.data ?? []) as ClaimedRow[];
  let attempted = 0;
  let failedClosed = 0;
  const errors: { account_id: string; error: string }[] = [];

  for (const row of rows) {
    attempted += 1;
    const accountId = row.account_id;
    const customerId = row.stripe_customer_id;
    const paymentMethodId = row.stripe_payment_method_id;

    try {
      if (!customerId || !paymentMethodId) {
        throw new Error("missing_customer_or_payment_method");
      }

      await createOffSessionPaymentIntent({
        stripeSecretKey,
        amount: FINAL_CHARGE_CENTS,
        customerId,
        paymentMethodId,
        accountId,
      });
      // Do not write status=active here — webhook is the sole terminal writer.
    } catch (err) {
      failedClosed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error("charge-trial-balance failed closed", {
        account_id: accountId,
        error: message,
      });
      errors.push({ account_id: accountId, error: message });

      const mark = await supabase.rpc("mark_couple_trial_charge_failed", {
        p_account_id: accountId,
      });
      if (mark.error) {
        console.error("mark_couple_trial_charge_failed failed", {
          account_id: accountId,
          error: mark.error.message,
        });
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      claimed: rows.length,
      attempted,
      failed_closed: failedClosed,
      errors,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
