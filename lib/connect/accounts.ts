import "server-only";

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const CAPABILITY_STATUSES = ["active", "pending", "restricted", "unsupported"] as const;

export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export type ConnectedAccountRow = {
  accountId: string;
  stripeAccountId: string;
  cardPaymentsStatus: CapabilityStatus;
  payoutsStatus: CapabilityStatus;
};

function asStatus(value: string | null | undefined): CapabilityStatus {
  if (value && (CAPABILITY_STATUSES as readonly string[]).includes(value)) {
    return value as CapabilityStatus;
  }
  return "pending";
}

function readCapabilities(account: Stripe.V2.Core.Account): {
  cardPaymentsStatus: CapabilityStatus;
  payoutsStatus: CapabilityStatus;
} {
  const merchant = account.configuration?.merchant;
  return {
    cardPaymentsStatus: asStatus(merchant?.capabilities?.card_payments?.status),
    payoutsStatus: asStatus(merchant?.capabilities?.stripe_balance?.payouts?.status),
  };
}

async function retrieveConnectedAccount(stripeAccountId: string) {
  const stripe = getStripe();
  return stripe.v2.core.accounts.retrieve(stripeAccountId, {
    include: ["configuration.merchant"],
  });
}

export async function refreshConnectedAccount(
  accountId: string,
): Promise<ConnectedAccountRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("stripe_connected_accounts")
    .select("account_id, stripe_account_id, card_payments_status, payouts_status")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const remote = await retrieveConnectedAccount(data.stripe_account_id);
  const capabilities = readCapabilities(remote);

  const { error: updateError } = await admin
    .from("stripe_connected_accounts")
    .update({
      card_payments_status: capabilities.cardPaymentsStatus,
      payouts_status: capabilities.payoutsStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    accountId,
    stripeAccountId: data.stripe_account_id,
    ...capabilities,
  };
}

export async function createConnectedAccount(input: {
  accountId: string;
  email: string;
  displayName: string;
}): Promise<ConnectedAccountRow> {
  const existing = await refreshConnectedAccount(input.accountId);
  if (existing) return existing;

  const stripe = getStripe();
  const created = await stripe.v2.core.accounts.create(
    {
      contact_email: input.email,
      display_name: input.displayName.slice(0, 100),
      dashboard: "express",
      identity: { country: "US" },
      defaults: {
        responsibilities: {
          fees_collector: "stripe",
          losses_collector: "stripe",
        },
        profile: {
          product_description: "Wedding venue and planning services",
        },
      },
      configuration: {
        merchant: {
          capabilities: {
            card_payments: { requested: true },
          },
        },
      },
      include: ["configuration.merchant"],
      metadata: {
        account_id: input.accountId,
        purpose: "proposal_payments",
      },
    },
    { idempotencyKey: `connect-acct-${input.accountId}` },
  );

  const capabilities = readCapabilities(created);
  const admin = createServiceRoleClient();
  const { error } = await admin.from("stripe_connected_accounts").insert({
    account_id: input.accountId,
    stripe_account_id: created.id,
    card_payments_status: capabilities.cardPaymentsStatus,
    payouts_status: capabilities.payoutsStatus,
  });

  if (error) {
    const raced = await refreshConnectedAccount(input.accountId);
    if (raced) return raced;
    throw new Error(error.message);
  }

  return {
    accountId: input.accountId,
    stripeAccountId: created.id,
    ...capabilities,
  };
}

export async function createAccountSessionClientSecret(
  stripeAccountId: string,
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.accountSessions.create({
    account: stripeAccountId,
    components: {
      account_onboarding: { enabled: true },
      notification_banner: { enabled: true },
      account_management: { enabled: true },
      payments: {
        enabled: true,
        features: {
          refund_management: true,
          dispute_management: true,
          capture_payments: false,
        },
      },
      payouts: { enabled: true },
    },
  });
  return session.client_secret;
}

export async function createExpressLoginLink(stripeAccountId: string): Promise<string> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  return link.url;
}

export function stripeErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    if (/signed up for Connect|connect/i.test(err.message) && /platform/i.test(err.message)) {
      return "Turn on Connect in the Stripe Dashboard, then try again.";
    }
    return err.message;
  }
  return "Stripe couldn't finish that request.";
}
