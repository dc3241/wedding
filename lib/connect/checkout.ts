import "server-only";

import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { refreshConnectedAccount } from "@/lib/connect/accounts";

const PURPOSE = "proposal_payment";

function integrationIdentifier() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `proposal_checkout_${suffix}`;
}

export function proposalAmountCents(total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const cents = Math.round(total * 100);
  if (cents <= 0 || cents > 99_999_999) return null;
  return cents;
}

export async function startProposalCheckout(input: {
  token: string;
  origin: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const token = input.token.trim();
  if (!token) return { ok: false, error: "This proposal link isn't valid." };

  const admin = createServiceRoleClient();
  const { data: proposal, error } = await admin
    .from("proposals")
    .select("id, account_id, title, total, status, access_token")
    .eq("access_token", token)
    .maybeSingle();

  if (error) return { ok: false, error: "Couldn't open this proposal." };
  if (!proposal || (proposal.status !== "sent" && proposal.status !== "accepted")) {
    return { ok: false, error: "This proposal isn't open for payment." };
  }

  const cents = proposalAmountCents(Number(proposal.total));
  if (!cents) return { ok: false, error: "This proposal doesn't have an amount to pay." };

  const { data: paid } = await admin
    .from("proposal_payments")
    .select("id")
    .eq("proposal_id", proposal.id)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();

  if (paid) return { ok: false, error: "This proposal is already paid." };

  const connected = await refreshConnectedAccount(proposal.account_id);
  if (!connected || connected.cardPaymentsStatus !== "active") {
    return { ok: false, error: "Card payments aren't ready on this proposal yet." };
  }

  const stripe = getStripe();
  const title =
    typeof proposal.title === "string" && proposal.title.trim()
      ? proposal.title.trim().slice(0, 120)
      : "Proposal";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: { name: title },
          },
        },
      ],
      success_url: `${input.origin}/proposal/${encodeURIComponent(token)}?checkout=returned`,
      cancel_url: `${input.origin}/proposal/${encodeURIComponent(token)}`,
      metadata: {
        purpose: PURPOSE,
        proposal_id: proposal.id,
        account_id: proposal.account_id,
      },
      integration_identifier: integrationIdentifier(),
    },
    { stripeAccount: connected.stripeAccountId },
  );

  if (!session.url) {
    return { ok: false, error: "Couldn't start checkout." };
  }

  const { error: insertError } = await admin.from("proposal_payments").insert({
    proposal_id: proposal.id,
    account_id: proposal.account_id,
    stripe_account_id: connected.stripeAccountId,
    stripe_checkout_session_id: session.id,
    amount_cents: cents,
    currency: "usd",
    status: "pending",
  });

  if (insertError) {
    return { ok: false, error: "Couldn't record this checkout." };
  }

  return { ok: true, url: session.url };
}
