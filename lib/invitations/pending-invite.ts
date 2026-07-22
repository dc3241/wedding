import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { acceptProjectInvitation } from "@/lib/invitations/actions";

const INVITE_COOKIE = "pending_invite_token";
const INVITE_COOKIE_MAX_AGE = 30 * 60; // 30 minutes

export type ConsumePendingInviteResult =
  | { projectId: string }
  | { error: string; token: string }
  | null;

/** Stash the raw invite token across signup/confirm/login. Never log it. */
export async function setPendingInvite(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: INVITE_COOKIE_MAX_AGE,
    path: "/",
  });
}

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
