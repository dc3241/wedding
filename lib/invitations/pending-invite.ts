import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { acceptProjectInvitation } from "@/lib/invitations/actions";
import { INVITE_COOKIE } from "@/lib/invitations/pending-invite-config";

export type ConsumePendingInviteResult =
  | { projectId: string }
  | { error: string; token: string }
  | null;

/**
 * If a pending invite cookie exists, accept it and clear the cookie.
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
