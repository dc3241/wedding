import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolvePersonalAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("accounts.kind", "personal")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error("No personal account found.");
  }

  return membership.account_id;
}

export async function resolveBusinessAccountId(
  supabase: SupabaseClient,
): Promise<string> {
  const { data: membership, error } = await supabase
    .from("account_members")
    .select("account_id, accounts!inner(kind)")
    .eq("accounts.kind", "business")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership) {
    throw new Error("No business account found.");
  }

  return membership.account_id;
}
