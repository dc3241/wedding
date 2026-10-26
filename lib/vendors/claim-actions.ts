"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  VENDOR_CLAIM_COOKIE,
  vendorClaimCookieOptions,
} from "@/lib/vendors/claim-config";
import { claimVendorShareToken } from "@/lib/vendors/pending-claim";
import { createClient } from "@/utils/supabase/server";

export type BeginVendorShareClaimResult =
  | { ok: true }
  | { ok: false; error: string };

function claimLoginPath() {
  const message = "Create a login to save this wedding on any device.";
  return `/login?mode=signup&message=${encodeURIComponent(message)}`;
}

export async function beginVendorShareClaim(
  token: string,
): Promise<BeginVendorShareClaimResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "This link isn’t valid." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const cookieStore = await cookies();
    cookieStore.set(VENDOR_CLAIM_COOKIE, trimmed, vendorClaimCookieOptions());
    redirect(claimLoginPath());
  }

  const result = await claimVendorShareToken(supabase, trimmed);
  if (!result.ok) {
    if (result.error === "has_account") {
      return {
        ok: false,
        error: "This save is for vendors. You’re already signed in to a First Look book.",
      };
    }
    if (result.error === "claimed") {
      return {
        ok: false,
        error: "Someone already saved this wedding on another login.",
      };
    }
    return { ok: false, error: "Could not save this wedding." };
  }

  redirect("/vendor-home");
}
