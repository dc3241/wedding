import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * AUTO-01's recipient resolution, extracted so AGENT-01 reuses it verbatim.
 * Every account_members email for the account (TEAM-01 seats included;
 * a personal account is simply one member).
 */
export async function resolveAccountEmails(
  supabase: ReturnType<typeof createServiceRoleClient>,
  accountIds: string[],
): Promise<Map<string, string[]>> {
  const emailsByAccount = new Map<string, string[]>();
  if (accountIds.length === 0) return emailsByAccount;

  const { data: members, error } = await supabase
    .from("account_members")
    .select("account_id, user_id")
    .in("account_id", accountIds);

  if (error) {
    throw new Error(error.message);
  }

  const userIds = [
    ...new Set((members ?? []).map((row) => row.user_id as string)),
  ];
  const emailByUserId = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error: userError } =
        await supabase.auth.admin.getUserById(userId);
      if (userError || !data.user?.email) return;
      emailByUserId.set(userId, data.user.email);
    }),
  );

  for (const row of members ?? []) {
    const email = emailByUserId.get(row.user_id as string);
    if (!email) continue;
    const list = emailsByAccount.get(row.account_id as string) ?? [];
    if (!list.includes(email)) list.push(email);
    emailsByAccount.set(row.account_id as string, list);
  }

  return emailsByAccount;
}
