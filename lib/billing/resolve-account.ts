import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

async function resolveOwnMembershipAccountId(
  supabase: SupabaseClient,
  kind: "personal" | "business",
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      kind === "business"
        ? "No business account found."
        : "No personal account found.",
    );
  }

  // Scope to the caller's row — fellow-member SELECT (TEAM-01) otherwise
  // returns every seat on the account.
  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("user_id", user.id)
    .eq("accounts.kind", kind)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error(
      kind === "business"
        ? "No business account found."
        : "No personal account found.",
    );
  }

  return membership.account_id;
}

export async function resolvePersonalAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  return resolveOwnMembershipAccountId(supabase, "personal");
}

export async function resolveBusinessAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  return resolveOwnMembershipAccountId(supabase, "business");
}
