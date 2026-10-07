import "server-only";

import type Stripe from "stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const PURPOSE = "proposal_payment";

function sessionOf(event: Stripe.Event): Stripe.Checkout.Session | null {
  const object = event.data.object;
  if (object.object !== "checkout.session") return null;
  return object;
}

/**
 * Marks a proposal payment from the Connect webhook. The success page
 * never writes this row. A session still unpaid (async methods) is left
 * pending until async_payment_succeeded.
 */
export async function fulfillProposalCheckout(event: Stripe.Event): Promise<void> {
  const connectedAccountId = event.account;
  if (!connectedAccountId) return;

  const session = sessionOf(event);
  if (!session || session.metadata?.purpose !== PURPOSE) return;

  const proposalId = session.metadata.proposal_id;
  if (!proposalId || !session.id) return;

  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from("proposal_payments")
    .select("id, status, stripe_account_id, proposal_id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return;
  if (row.stripe_account_id !== connectedAccountId) return;
  if (row.proposal_id !== proposalId) return;
  if (row.status === "paid") return;

  if (event.type === "checkout.session.async_payment_failed") {
    await admin
      .from("proposal_payments")
      .update({ status: "failed" })
      .eq("id", row.id)
      .eq("status", "pending");
    return;
  }

  if (session.payment_status === "unpaid") return;
  if (session.payment_status !== "paid") return;

  const { error: updateError } = await admin
    .from("proposal_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending");

  if (updateError) throw new Error(updateError.message);
}
