export const INVITE_COOKIE = "pending_invite_token";
export const ACCOUNT_INVITE_COOKIE = "pending_account_invite_token";

const INVITE_COOKIE_MAX_AGE = 30 * 60; // 30 minutes

export function pendingInviteCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: INVITE_COOKIE_MAX_AGE,
    path: "/",
  };
}
