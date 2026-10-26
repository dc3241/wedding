import type { AccountContext } from "@/lib/account-context";

/**
 * Owner-account only. Self-serve couples and planner/venue members on
 * their own book. Invited project members (couple/collaborator) cannot
 * share — they are not on the owning account.
 */
export function canShareProjectVendors(
  account: AccountContext | null,
  projectId: string,
): boolean {
  return Boolean(account?.projectIds.includes(projectId));
}
