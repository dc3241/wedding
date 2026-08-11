import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountContext } from "@/lib/account-context";
import {
  ACCOUNT_LOCKED_PATH,
  checkEntitlement,
} from "@/lib/billing/entitlement-gate";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";

/** Resolve where to send a user immediately after authentication. */
export async function getPostLoginPath(
  supabase: SupabaseClient,
): Promise<string> {
  const account = await getAccountContext(supabase);

  if (!account) {
    return "/projects";
  }

  const { entitled } = await checkEntitlement(supabase, account.accountId);
  if (!entitled) {
    return ACCOUNT_LOCKED_PATH;
  }

  if (account.kind === "business") {
    return "/dashboard";
  }

  if (account.singleProjectId) {
    return getCoupleDestinationPath(supabase, account.singleProjectId);
  }

  return "/projects";
}
