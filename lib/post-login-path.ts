import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountContext } from "@/lib/account-context";
import {
  ACCOUNT_LOCKED_PATH,
  checkEntitlement,
} from "@/lib/billing/entitlement-gate";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { pendingReachOutPath } from "@/lib/directory/pending";
import { hasClaimedVendorShares } from "@/lib/vendors/claimed-shares";

/** Resolve where to send a user immediately after authentication. */
export async function getPostLoginPath(
  supabase: SupabaseClient,
): Promise<string> {
  const account = await getAccountContext(supabase);

  if (!account) {
    if (await hasClaimedVendorShares()) {
      return "/vendor-home";
    }
    return "/projects";
  }

  const { entitled } = await checkEntitlement(supabase, account.accountId);
  if (!entitled) {
    return ACCOUNT_LOCKED_PATH;
  }

  if (account.kind === "business") {
    return account.isDemo ? "/demo" : "/dashboard";
  }

  if (account.singleProjectId) {
    const destination = await getCoupleDestinationPath(supabase, account.singleProjectId);
    // A couple who tapped "Reach out" on a directory venue before signing in
    // finishes that first, once onboarding is done.
    if (destination !== "/onboarding") {
      const reachOut = await pendingReachOutPath();
      if (reachOut) return reachOut;
    }
    return destination;
  }

  return "/projects";
}
