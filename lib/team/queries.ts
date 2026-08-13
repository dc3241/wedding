import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountMemberRow,
  PendingAccountInvitationRow,
} from "@/lib/team/types";

export async function listAccountMembers(
  supabase: SupabaseClient,
  accountId: string,
): Promise<AccountMemberRow[]> {
  const { data, error } = await supabase.rpc("list_account_members", {
    p_account_id: accountId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(
    (row: { user_id: string; email: string; created_at: string }) => ({
      userId: row.user_id,
      email: row.email ?? "Member",
      createdAt: row.created_at,
    }),
  );
}

export async function listPendingInvitations(
  supabase: SupabaseClient,
  accountId: string,
): Promise<PendingAccountInvitationRow[]> {
  const { data, error } = await supabase
    .from("account_invitations")
    .select("id, email, expires_at, created_at")
    .eq("account_id", accountId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}
