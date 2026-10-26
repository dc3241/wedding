export const VENDOR_CLAIM_COOKIE = "pending_vendor_claim_token";

const VENDOR_CLAIM_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export function vendorClaimCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: VENDOR_CLAIM_COOKIE_MAX_AGE,
    path: "/",
  };
}
