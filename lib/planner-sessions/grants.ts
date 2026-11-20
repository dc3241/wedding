import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  getPlannerOffer,
  PLANNER_CHECKOUT_PURPOSE,
  PLANNER_SUPPORT_PURPOSE,
  type PlannerSessionKind,
} from "@/lib/planner-sessions/catalog";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const DAY_MS = 86_400_000;

/** True when a Checkout Session belongs to Talk to a planner. */
export function isPlannerCheckout(session: Stripe.Checkout.Session): boolean {
  const purpose = session.metadata?.purpose;
  return (
    purpose === PLANNER_CHECKOUT_PURPOSE || purpose === PLANNER_SUPPORT_PURPOSE
  );
}

/** True when a Subscription is the monthly planner-support plan. */
export function isPlannerSupportSubscription(
  subscription: Stripe.Subscription,
): boolean {
  return subscription.metadata?.purpose === PLANNER_SUPPORT_PURPOSE;
}

type GrantInsert = {
  account_id: string;
  offer: string;
  session_kind: PlannerSessionKind;
  quantity: number;
  expires_at: string;
  stripe_ref: string;
  amount_cents: number | null;
};

/** Idempotent on stripe_ref — a repeated webhook is a no-op. */
async function insertGrant(row: GrantInsert): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("planner_session_grants")
    .upsert(row, { onConflict: "stripe_ref", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/**
 * One-time offers (quick / single / pack_3 / final_stretch).
 * Shared by the webhook and the Checkout-return reconcile.
 */
async function grantFromPaymentCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const accountId = session.metadata?.account_id;
  const offer = getPlannerOffer(session.metadata?.offer ?? "");
  if (!accountId || !offer || offer.recurring) {
    console.error("PLANNER-HELP-01: payment checkout missing metadata", {
      sessionId: session.id,
    });
    return;
  }
  if (session.payment_status !== "paid") return;

  await insertGrant({
    account_id: accountId,
    offer: offer.id,
    session_kind: offer.sessionKind,
    quantity: offer.credits,
    expires_at: new Date(
      Date.now() + (offer.validDays ?? 180) * DAY_MS,
    ).toISOString(),
    stripe_ref: session.id,
    amount_cents: session.amount_total ?? offer.priceCents,
  });
}

async function upsertSupportSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const accountId = subscription.metadata?.account_id;
  if (!accountId) return null;
  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const admin = createServiceRoleClient();
  const { error } = await admin.from("planner_support_subscriptions").upsert(
    {
      stripe_subscription_id: subscription.id,
      account_id: accountId,
      status: subscription.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw new Error(error.message);
  return accountId;
}

/** customer.subscription.* for the support plan. Never touches `subscriptions`. */
export async function syncPlannerSupportSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  await upsertSupportSubscription(subscription);
}

/**
 * Monthly credits: two full sessions per PAID invoice, expiring at that
 * invoice's period end. Idempotent on the invoice id.
 */
export async function grantFromSupportInvoice(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
): Promise<void> {
  if (invoice.status !== "paid" || !invoice.id) return;
  const accountId = await upsertSupportSubscription(subscription);
  const offer = getPlannerOffer("monthly");
  if (!accountId || !offer) return;

  const line = invoice.lines?.data?.[0];
  const periodEndSec =
    line?.period?.end ?? subscription.items.data[0]?.current_period_end ?? null;
  const expiresAt = periodEndSec
    ? new Date(periodEndSec * 1000)
    : new Date(Date.now() + 31 * DAY_MS);

  await insertGrant({
    account_id: accountId,
    offer: "monthly",
    session_kind: offer.sessionKind,
    quantity: offer.credits,
    expires_at: expiresAt.toISOString(),
    stripe_ref: invoice.id,
    amount_cents: invoice.amount_paid ?? offer.priceCents,
  });
}

/**
 * checkout.session.completed / Checkout-return reconcile entry point.
 * Subscription mode grants from its first (latest) paid invoice.
 */
export async function applyPlannerCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode === "payment") {
    await grantFromPaymentCheckout(session);
    return;
  }

  if (session.mode !== "subscription" || !session.subscription) return;

  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });
  const latest = subscription.latest_invoice;
  if (latest && typeof latest !== "string") {
    await grantFromSupportInvoice(latest, subscription);
  } else {
    await syncPlannerSupportSubscription(subscription);
  }
}

/**
 * Return-page fallback for a missed webhook (CHECKOUT-RECONCILE-01 posture).
 * Verifies the session belongs to the authenticated account.
 */
export async function reconcilePlannerCheckoutReturn(
  accountId: string,
  sessionId: string | undefined,
): Promise<void> {
  if (!sessionId) return;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") return;
    if (!isPlannerCheckout(session)) return;
    if (session.metadata?.account_id !== accountId) {
      console.error("PLANNER-HELP-01: return session account mismatch", {
        accountId,
      });
      return;
    }
    await applyPlannerCheckout(session);
  } catch (err) {
    console.error("PLANNER-HELP-01: reconcile failed", err);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type PlannerSessionRow = {
  id: string;
  session_kind: PlannerSessionKind;
  status: "requested" | "scheduled" | "completed" | "no_show" | "canceled";
  question: string;
  preferred_times: string | null;
  scheduled_at: string | null;
  meeting_url: string | null;
  recap: string | null;
  created_at: string;
};

export type PlannerBalance = {
  quick: number;
  full: number;
  /** Soonest expiry among grants that still have credits. */
  nextExpiry: string | null;
};

export type PlannerSupportStatus = {
  active: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const CONSUMING = new Set(["requested", "scheduled", "completed", "no_show"]);

export async function loadPlannerHelp(
  supabase: SupabaseClient,
  accountId: string,
): Promise<{
  balance: PlannerBalance;
  sessions: PlannerSessionRow[];
  support: PlannerSupportStatus;
}> {
  const [grantsRes, sessionsRes, supportRes] = await Promise.all([
    supabase
      .from("planner_session_grants")
      .select("id, session_kind, quantity, expires_at")
      .eq("account_id", accountId),
    supabase
      .from("planner_sessions")
      .select(
        "id, grant_id, session_kind, status, question, preferred_times, scheduled_at, meeting_url, recap, created_at",
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("planner_support_subscriptions")
      .select("status, current_period_end, cancel_at_period_end")
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (grantsRes.error) throw new Error(grantsRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);

  const used = new Map<string, number>();
  for (const s of sessionsRes.data ?? []) {
    if (CONSUMING.has(s.status)) {
      used.set(s.grant_id, (used.get(s.grant_id) ?? 0) + 1);
    }
  }

  const now = Date.now();
  const balance: PlannerBalance = { quick: 0, full: 0, nextExpiry: null };
  for (const g of grantsRes.data ?? []) {
    if (new Date(g.expires_at).getTime() <= now) continue;
    const left = g.quantity - (used.get(g.id) ?? 0);
    if (left <= 0) continue;
    balance[g.session_kind as PlannerSessionKind] += left;
    if (!balance.nextExpiry || g.expires_at < balance.nextExpiry) {
      balance.nextExpiry = g.expires_at;
    }
  }

  const supportRow = supportRes.data;
  const support: PlannerSupportStatus = {
    active:
      supportRow?.status === "active" || supportRow?.status === "trialing",
    currentPeriodEnd: supportRow?.current_period_end ?? null,
    cancelAtPeriodEnd: supportRow?.cancel_at_period_end ?? false,
  };

  return {
    balance,
    sessions: (sessionsRes.data ?? []).map((s) => ({
      id: s.id,
      session_kind: s.session_kind,
      status: s.status,
      question: s.question,
      preferred_times: s.preferred_times,
      scheduled_at: s.scheduled_at,
      meeting_url: s.meeting_url,
      recap: s.recap,
      created_at: s.created_at,
    })),
    support,
  };
}
