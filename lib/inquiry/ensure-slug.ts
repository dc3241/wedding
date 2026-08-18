import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugifyInquiryName } from "@/lib/inquiry/parse";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * Lazy-generate accounts.inquiry_slug on first relevant use.
 * Never populates personal accounts.
 *
 * Reads through the caller (RLS). Writes through service role —
 * authenticated has SELECT on accounts but not UPDATE, so a member
 * client update raises "permission denied for table accounts".
 */
export async function ensureInquirySlug(
  supabase: SupabaseClient,
  accountId: string,
  kind: string,
): Promise<string | null> {
  if (kind !== "business") return null;

  const { data: account, error } = await supabase
    .from("accounts")
    .select("inquiry_slug, name, kind")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account || account.kind !== "business") return null;
  if (account.inquiry_slug) return account.inquiry_slug;

  const base = slugifyInquiryName(account.name);
  let candidate = base;
  const admin = createServiceRoleClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error: updateError } = await admin
      .from("accounts")
      .update({ inquiry_slug: candidate })
      .eq("id", accountId)
      .is("inquiry_slug", null);

    if (!updateError) {
      const { data: saved } = await admin
        .from("accounts")
        .select("inquiry_slug")
        .eq("id", accountId)
        .maybeSingle();
      return saved?.inquiry_slug ?? candidate;
    }

    if (updateError.code !== "23505") {
      console.error("ensureInquirySlug update failed:", updateError.message);
      return null;
    }

    candidate = `${base}-${randomBytes(2).toString("hex")}`;
  }

  console.error("ensureInquirySlug could not allocate an inquiry slug.");
  return null;
}
