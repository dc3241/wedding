import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { acceptProjectInvitation } from "@/lib/invitations/actions";
import {
  ACCOUNT_INVITE_COOKIE,
  INVITE_COOKIE,
} from "@/lib/invitations/pending-invite-config";
import { acceptAccountInvitation } from "@/lib/team/actions";

export type ConsumePendingInviteResult =
  | { projectId: string }
  | { error: string; token: string }
  | null;

export type ConsumePendingAccountInviteResult =
  | { accountId: string }
  | { error: string; token: string }
  | null;

export type ConsumePendingInvitesResult = {
  project: ConsumePendingInviteResult;
  account: ConsumePendingAccountInviteResult;
};

/**
 * If a pending project-invite cookie exists, accept it and clear the cookie.
 * Returns null when absent (normal login). Never throws.
 * On failure, returns the token so the caller can redirect to /invite/{token}?error=.
 */
export async function consumePendingInvite(
  _supabase: SupabaseClient,
): Promise<ConsumePendingInviteResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(INVITE_COOKIE)?.value;

    if (!token) {
      return null;
    }

    cookieStore.delete(INVITE_COOKIE);

    const result = await acceptProjectInvitation(token);

    if (result.ok) {
      return { projectId: result.projectId };
    }

    return { error: result.error, token };
  } catch {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(INVITE_COOKIE);
    } catch {
      // ignore — must not break login
    }
    return null;
  }
}

/**
 * If a pending account-invite cookie exists, accept it and clear the cookie.
 * Parallel to consumePendingInvite — separate cookie name so both can queue.
 * Never throws.
 */
export async function consumePendingAccountInvite(
  _supabase: SupabaseClient,
): Promise<ConsumePendingAccountInviteResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCOUNT_INVITE_COOKIE)?.value;

    if (!token) {
      return null;
    }

    cookieStore.delete(ACCOUNT_INVITE_COOKIE);

    const result = await acceptAccountInvitation(token);

    if (result.ok) {
      return { accountId: result.accountId };
    }

    return { error: result.error, token };
  } catch {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(ACCOUNT_INVITE_COOKIE);
    } catch {
      // ignore — must not break login
    }
    return null;
  }
}

/**
 * Consume project and account pending-invite cookies (whichever are present).
 * Runs before getPostLoginPath so membership exists for routing.
 */
export async function consumePendingInvites(
  supabase: SupabaseClient,
): Promise<ConsumePendingInvitesResult> {
  const [project, account] = await Promise.all([
    consumePendingInvite(supabase),
    consumePendingAccountInvite(supabase),
  ]);
  return { project, account };
}
