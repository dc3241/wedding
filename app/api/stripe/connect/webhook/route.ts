import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillProposalCheckout } from "@/lib/connect/fulfill";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
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
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
        await fulfillProposalCheckout(event);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe Connect webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
