import "server-only";

import { createClient } from "@/utils/supabase/server";

export type VendorShareClaimStatus = "unclaimed" | "mine" | "other" | "invalid";

export type ClaimedVendorShare = {
  projectVendorId: string;
  vendorName: string;
  vendorCategory: string | null;
  weddingName: string;
  weddingDate: string | null;
  unreadCount: number;
  href: string;
};

function asStatus(value: unknown): VendorShareClaimStatus {
  if (
    value === "unclaimed" ||
    value === "mine" ||
    value === "other" ||
    value === "invalid"
  ) {
    return value;
  }
  return "invalid";
}

export async function getVendorShareClaimStatus(
  token: string,
): Promise<VendorShareClaimStatus | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("vendor_share_claim_status", {
    p_token: trimmed,
  });
  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("vendor_share_claim_status:", error.message);
    }
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return asStatus(row?.status);
}

export async function listClaimedVendorShares(): Promise<ClaimedVendorShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_claimed_vendor_shares");
  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("list_claimed_vendor_shares:", error.message);
    }
    return [];
  }

  if (!Array.isArray(data)) return [];
  return data.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (
      typeof item.project_vendor_id !== "string" ||
      typeof item.confirm_token !== "string" ||
      typeof item.vendor_name !== "string" ||
      typeof item.wedding_name !== "string"
    ) {
      return [];
    }
    const unread =
      typeof item.unread_count === "number" && Number.isFinite(item.unread_count)
        ? item.unread_count
        : 0;
    return [
      {
        projectVendorId: item.project_vendor_id,
        vendorName: item.vendor_name,
        vendorCategory:
          typeof item.vendor_category === "string" ? item.vendor_category : null,
        weddingName: item.wedding_name,
        weddingDate:
          typeof item.wedding_date === "string" ? item.wedding_date : null,
        unreadCount: unread,
        href: `/vendor/${encodeURIComponent(item.confirm_token)}`,
      },
    ];
  });
}

export async function hasClaimedVendorShares(): Promise<boolean> {
  const shares = await listClaimedVendorShares();
  return shares.length > 0;
}
