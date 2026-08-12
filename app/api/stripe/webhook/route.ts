import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCouplePriceId } from "@/lib/billing/plans";
import {
  markSubscriptionCanceled,
  syncSubscriptionById,
  syncSubscriptionFromStripe,
  upsertSubscriptionRow,
} from "@/lib/billing/sync-subscription";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCoupleLifetimeCheckout(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const accountId = session.metadata?.account_id;
  if (!accountId) {
    console.error(
      "Stripe checkout.session.completed (couple_lifetime): missing account_id metadata.",
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
      "Stripe checkout.session.completed (couple_lifetime): missing customer.",
      { accountId },
    );
    return;
  }

  await upsertSubscriptionRow({
    account_id: accountId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    status: "active",
    price_id: getCouplePriceId("lifetime"),
    current_period_end: null,
    cancel_at_period_end: false,
  });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  // PRICE-08: one-time $99 couple lifetime.
  if (session.mode === "payment") {
    if (session.metadata?.charge_stage !== "couple_lifetime") {
      return;
    }
    await handleCoupleLifetimeCheckout(session);
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
