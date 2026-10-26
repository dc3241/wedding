import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { VENDOR_CLAIM_COOKIE } from "@/lib/vendors/claim-config";

export type ConsumePendingVendorClaimResult =
  | { ok: true }
  | { error: string; token: string }
  | null;

function mapClaimError(code: string | null): string {
  if (code === "has_account") return "has_account";
  if (code === "claimed") return "claimed";
  if (code === "not_authenticated") return "invalid";
  return "invalid";
}

export async function claimVendorShareToken(
  supabase: SupabaseClient,
  token: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "invalid" };

  const { data, error } = await supabase.rpc("claim_vendor_share", {
    p_token: trimmed,
  });
  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("claim_vendor_share:", error.message);
    }
    return { ok: false, error: "invalid" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.claimed !== true) {
    return {
      ok: false,
      error: mapClaimError(typeof row?.error_code === "string" ? row.error_code : null),
    };
  }
  return { ok: true };
}

/**
 * If a pending vendor-claim cookie exists, claim it and clear the cookie.
 * Never throws. Missing RPC / expired cookie fail open.
 */
export async function consumePendingVendorClaim(
  supabase: SupabaseClient,
): Promise<ConsumePendingVendorClaimResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(VENDOR_CLAIM_COOKIE)?.value;
    if (!token) return null;

    cookieStore.delete(VENDOR_CLAIM_COOKIE);
    const result = await claimVendorShareToken(supabase, token);
    if (result.ok) return { ok: true };
    return { error: result.error, token };
  } catch {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(VENDOR_CLAIM_COOKIE);
    } catch {
      // ignore — must not break login
    }
    return null;
  }
}
