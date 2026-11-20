"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account-context";
import { getOrCreateStripeCustomer } from "@/lib/billing/get-or-create-customer";
import { resolvePersonalAccountId } from "@/lib/billing/resolve-account";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import {
  getPlannerOffer,
  PLANNER_CHECKOUT_PURPOSE,
  PLANNER_SUPPORT_PURPOSE,
  SESSION_MINUTES,
  type PlannerSessionKind,
} from "@/lib/planner-sessions/catalog";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

const PATH = "/account/planner-help";

async function baseUrl() {
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3000";
}

/** Optional Dashboard Price override per offer, else inline price_data. */
function envPriceId(offerId: string): string | null {
  const key = `STRIPE_PRICE_PLANNER_${offerId.toUpperCase()}`;
  return process.env[key]?.trim() || null;
}

export async function createPlannerHelpCheckout(formData: FormData) {
  const offer = getPlannerOffer(String(formData.get("offer") ?? ""));
  if (!offer) throw new Error("Choose a planner session option.");

  const supabase = await createClient();
  const accountId = await resolvePersonalAccountId(supabase);
  const customerId = await getOrCreateStripeCustomer(accountId);
  const origin = await baseUrl();
  const stripe = getStripe();
  const priceId = envPriceId(offer.id);

  const lineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: offer.priceCents,
          product_data: {
            name: `Talk to a planner — ${offer.name}`,
            description: offer.cadence,
          },
          ...(offer.recurring
            ? { recurring: { interval: "month" as const } }
            : {}),
        },
      };

  const metadata = {
    account_id: accountId,
    offer: offer.id,
    purpose: offer.recurring ? PLANNER_SUPPORT_PURPOSE : PLANNER_CHECKOUT_PURPOSE,
  };

  const success_url = `${origin}${PATH}?status=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${origin}${PATH}?status=cancelled`;

  const session = offer.recurring
    ? await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [lineItem],
        success_url,
        cancel_url,
        metadata,
        subscription_data: { metadata },
      })
    : await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [lineItem],
        success_url,
        cancel_url,
        metadata,
        payment_intent_data: { metadata },
      });

  if (!session.url) throw new Error("Could not start checkout.");
  redirect(session.url);
}

export type RequestSessionResult =
  | { ok: true }
  | { ok: false; error: string };

const RPC_ERRORS: Record<string, string> = {
  no_credits:
    "You don't have a session of that length left. Buy one below to book.",
  question_too_short:
    "Tell us a little more about what you need help with (10+ characters).",
  invalid_project: "That wedding isn't on your account.",
  not_authorized: "Please sign in again.",
};

function friendlyRpcError(message: string): string {
  for (const [code, text] of Object.entries(RPC_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return "Something went wrong. Please try again.";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function requestPlannerSession(
  _prev: RequestSessionResult | null,
  formData: FormData,
): Promise<RequestSessionResult> {
  const kindRaw = String(formData.get("kind") ?? "");
  const kind: PlannerSessionKind | null =
    kindRaw === "quick" || kindRaw === "full" ? kindRaw : null;
  const question = String(formData.get("question") ?? "").trim().slice(0, 4000);
  const preferred = String(formData.get("preferred_times") ?? "")
    .trim()
    .slice(0, 1000);

  if (!kind) return { ok: false, error: "Choose a session length." };

  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  if (!account || account.kind !== "personal") {
    return { ok: false, error: "Planner sessions are for couple accounts." };
  }

  const { error } = await supabase.rpc("request_planner_session", {
    p_account_id: account.accountId,
    p_session_kind: kind,
    p_question: question,
    p_preferred_times: preferred || null,
    p_project_id: account.firstProjectId,
  });

  if (error) return { ok: false, error: friendlyRpcError(error.message) };

  const notifyTo =
    process.env.PLANNER_SESSIONS_NOTIFY_EMAIL?.trim() ||
    process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (notifyTo) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const minutes = SESSION_MINUTES[kind];
    const text = [
      `New ${minutes}-minute planner session request.`,
      `From: ${user?.email ?? "unknown"}`,
      "",
      "Question:",
      question,
      "",
      `Preferred times: ${preferred || "—"}`,
      "",
      "Schedule it in /admin/planner-sessions.",
    ].join("\n");
    await sendEmailBestEffort(
      {
        to: notifyTo,
        subject: `Planner session request (${minutes} min)`,
        text,
        html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
        ...(user?.email ? { replyTo: user.email } : {}),
      },
      "PLANNER-HELP-01 request notify",
    );
  }

  revalidatePath(PATH);
  return { ok: true };
}

export async function cancelPlannerSession(formData: FormData) {
  const id = String(formData.get("sessionId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_planner_session", {
    p_session_id: id,
  });
  if (error) {
    redirect(
      `${PATH}?error=${error.message.includes("cannot_cancel") ? "late_cancel" : "cancel_failed"}`,
    );
  }
  revalidatePath(PATH);
}
