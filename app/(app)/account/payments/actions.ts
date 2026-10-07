"use server";

import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account-context";
import {
  createAccountSessionClientSecret,
  createConnectedAccount,
  createExpressLoginLink,
  refreshConnectedAccount,
  stripeErrorMessage,
} from "@/lib/connect/accounts";
import { createClient } from "@/utils/supabase/server";

const PAYMENTS_PATH = "/account/payments";

async function requireBusinessAccount() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  if (!account || account.kind !== "business") {
    redirect("/account/billing");
  }
  if (account.isDemo) {
    redirect(`${PAYMENTS_PATH}?error=${encodeURIComponent("Payments aren't available on the demo workspace.")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect(`${PAYMENTS_PATH}?error=${encodeURIComponent("Add an email to your login before setting up payments.")}`);
  }

  const { data: row } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", account.accountId)
    .maybeSingle();

  return {
    accountId: account.accountId,
    email: user.email,
    displayName:
      typeof row?.name === "string" && row.name.trim() ? row.name.trim() : "First Look",
  };
}

export async function startPaymentsSetup() {
  const business = await requireBusinessAccount();
  try {
    await createConnectedAccount(business);
  } catch (err) {
    redirect(
      `${PAYMENTS_PATH}?error=${encodeURIComponent(stripeErrorMessage(err))}`,
    );
  }
  redirect(PAYMENTS_PATH);
}

export async function refreshPaymentsStatus() {
  const business = await requireBusinessAccount();
  try {
    await refreshConnectedAccount(business.accountId);
  } catch (err) {
    redirect(
      `${PAYMENTS_PATH}?error=${encodeURIComponent(stripeErrorMessage(err))}`,
    );
  }
  redirect(PAYMENTS_PATH);
}

export async function openExpressDashboard() {
  const business = await requireBusinessAccount();
  const connected = await refreshConnectedAccount(business.accountId);
  if (!connected) {
    redirect(PAYMENTS_PATH);
  }
  try {
    const url = await createExpressLoginLink(connected.stripeAccountId);
    redirect(url);
  } catch (err) {
    redirect(
      `${PAYMENTS_PATH}?error=${encodeURIComponent(stripeErrorMessage(err))}`,
    );
  }
}

export async function fetchConnectClientSecret(): Promise<string> {
  const business = await requireBusinessAccount();
  const connected = await refreshConnectedAccount(business.accountId);
  if (!connected) {
    throw new Error("Set up payments before opening the Stripe panel.");
  }
  return createAccountSessionClientSecret(connected.stripeAccountId);
}
