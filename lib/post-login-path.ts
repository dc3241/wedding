import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountContext } from "@/lib/account-context";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";

/** Resolve where to send a user immediately after authentication. */
export async function getPostLoginPath(
  supabase: SupabaseClient,
): Promise<string> {
  const account = await getAccountContext(supabase);

  if (!account) {
    return "/projects";
  }

  if (account.kind === "business") {
    return "/dashboard";
  }

  if (account.singleProjectId) {
    return getCoupleDestinationPath(supabase, account.singleProjectId);
  }

  return "/projects";
}
