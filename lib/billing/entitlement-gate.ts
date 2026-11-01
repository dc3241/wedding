import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSubscriptionForAccount } from "@/lib/billing/get-subscription";

/** App path for the entitlement lock screen (ENT-01). */
export const ACCOUNT_LOCKED_PATH = "/account/locked";

/**
 * Single entitlement check for routing entry points.
 * Demo bypass and active/trialing logic live in getSubscriptionForAccount —
 * do not re-home isActive branching elsewhere.
 *
 * COUPLES-PIVOT part 3: couples (personal accounts) are always entitled to
 * the app — every planning tool is free. Only the assistant and agentic
 * runs are paid, and those are gated separately in
 * lib/billing/assistant-access.ts. Business accounts keep the lock screen.
 */
export async function checkEntitlement(
  supabase: SupabaseClient,
  accountId: string,
): Promise<{ entitled: boolean }> {
  const { data: account } = await supabase
    .from("accounts")
    .select("kind")
    .eq("id", accountId)
    .maybeSingle();

  if (account?.kind === "personal") {
    return { entitled: true };
  }

  const subscription = await getSubscriptionForAccount(supabase, accountId);
  return { entitled: subscription.isActive };
}
