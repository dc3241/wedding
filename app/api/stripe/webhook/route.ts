import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  markSubscriptionCanceled,
  syncSubscriptionById,
  syncSubscriptionFromStripe,
  upsertSubscriptionRow,
} from "@/lib/billing/sync-subscription";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function paymentMethodIdFromSession(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const stripe = getStripe();
  const paymentIntentRef = session.payment_intent;

  if (!paymentIntentRef) {
    return null;
  }

  const paymentIntentId =
    typeof paymentIntentRef === "string"
      ? paymentIntentRef
      : paymentIntentRef.id;

  // Webhook payloads usually leave payment_intent unexpanded — retrieve.
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentMethod = paymentIntent.payment_method;

  if (!paymentMethod) {
    return null;
  }

  return typeof paymentMethod === "string" ? paymentMethod : paymentMethod.id;
}

async function handleCoupleTrialWeekCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const accountId = session.metadata?.account_id;
  if (!accountId) {
    console.error(
      "Stripe checkout.session.completed (trial_week): missing account_id metadata.",
    );
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && !session.customer.deleted
        ? session.customer.id
        : null;

  if (!customerId) {
    console.error(
      "Stripe checkout.session.completed (trial_week): missing customer.",
      { accountId },
    );
    return;
  }

  const paymentMethodId = await paymentMethodIdFromSession(session);
  if (!paymentMethodId) {
    console.error(
      "Stripe checkout.session.completed (trial_week): missing payment_method.",
      { accountId },
    );
    return;
  }

  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    stripe_payment_method_id: paymentMethodId,
    status: "trialing",
    price_id: null,
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
  });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // PRICE-03: one-time $7 couple trial week (card saved for PRICE-04).
  if (session.mode === "payment") {
    if (session.metadata?.charge_stage !== "trial_week") {
      return;
    }
    await handleCoupleTrialWeekCheckout(session);
    return;
  }

  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  await syncSubscriptionById(subscriptionId);
}

async function handleInvoiceEvent(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;

  if (!subscriptionRef) {
    return;
  }

  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;

  await syncSubscriptionById(subscriptionId);
}

/**
 * PRICE-04: day-7 $92 off-session outcome.
 * Ignores trial_week ($7) PaymentIntents — those are owned by checkout.session.completed.
 * Writes terminal status unconditionally (overwrites `charging` / even a premature `canceled`).
 */
async function handleTrialFinalPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  status: "active" | "canceled",
): Promise<void> {
  if (paymentIntent.metadata?.charge_stage !== "trial_final") {
    return;
  }

  const accountId = paymentIntent.metadata?.account_id;
  if (!accountId) {
    console.error(
      `Stripe payment_intent (${status}): missing account_id metadata for trial_final.`,
    );
    return;
  }

  const customerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer && !paymentIntent.customer.deleted
        ? paymentIntent.customer.id
        : null;

  if (!customerId) {
    console.error(
      `Stripe payment_intent (${status}): missing customer for trial_final.`,
      { accountId },
    );
    return;
  }

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    status,
    price_id: null,
    current_period_end: null,
    cancel_at_period_end: false,
    // omit stripe_payment_method_id — leave the saved card on file
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscriptionFromStripe(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await markSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await handleInvoiceEvent(event.data.object as Stripe.Invoice);
        break;
      case "payment_intent.succeeded":
        await handleTrialFinalPaymentIntent(
          event.data.object as Stripe.PaymentIntent,
          "active",
        );
        break;
      case "payment_intent.payment_failed":
        await handleTrialFinalPaymentIntent(
          event.data.object as Stripe.PaymentIntent,
          "canceled",
        );
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
