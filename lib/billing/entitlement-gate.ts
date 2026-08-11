import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSubscriptionForAccount } from "@/lib/billing/get-subscription";

/** App path for the entitlement lock screen (ENT-01). */
export const ACCOUNT_LOCKED_PATH = "/account/locked";

/**
 * Single entitlement check for routing entry points.
 * Demo bypass and active/trialing logic live in getSubscriptionForAccount —
 * do not re-home isActive branching elsewhere.
 */
export async function checkEntitlement(
  supabase: SupabaseClient,
  accountId: string,
): Promise<{ entitled: boolean }> {
  const subscription = await getSubscriptionForAccount(supabase, accountId);
  return { entitled: subscription.isActive };
}
