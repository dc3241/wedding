import "server-only";

import { cookies } from "next/headers";
import {
  isValidListingSlug,
  REACH_OUT_COOKIE,
  reachOutPath,
} from "@/lib/directory/reach-out";

/**
 * If a couple tapped "Reach out" before signing up or finishing onboarding,
 * return the path that completes it. Never throws.
 */
export async function pendingReachOutPath(): Promise<string | null> {
  try {
    const slug = (await cookies()).get(REACH_OUT_COOKIE)?.value;
    return slug && isValidListingSlug(slug) ? reachOutPath(slug) : null;
  } catch {
    return null;
  }
}
