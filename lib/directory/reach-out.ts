export const REACH_OUT_COOKIE = "pending_reach_out_listing";

export function reachOutCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 3,
    path: "/",
  };
}

/** Listing slugs are lowercase kebab; reject anything else before use. */
export function isValidListingSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160;
}

export function reachOutPath(slug: string) {
  return `/reach-out/${slug}`;
}
