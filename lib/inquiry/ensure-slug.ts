import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugifyInquiryName } from "@/lib/inquiry/parse";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/** Public demo URLs must not slugify a live account's business name. */
export const DEMO_INQUIRY_SLUG_BASE = "demo-studio";

export function isDemoInquirySlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return (
    slug === DEMO_INQUIRY_SLUG_BASE ||
    slug.startsWith(`${DEMO_INQUIRY_SLUG_BASE}-`)
  );
}

/**
 * Lazy-generate accounts.inquiry_slug on first relevant use.
 * Never populates personal accounts. Demo clones always get a generic
 * `demo-studio` slug — never a slug derived from the template's name.
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
    .select("inquiry_slug, name, kind, is_demo")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !account || account.kind !== "business") return null;

  const isDemo = account.is_demo === true;
  if (account.inquiry_slug && (!isDemo || isDemoInquirySlug(account.inquiry_slug))) {
    return account.inquiry_slug;
  }

  const base = isDemo
    ? DEMO_INQUIRY_SLUG_BASE
    : slugifyInquiryName(account.name);
  const overwriteLeakedDemoSlug = isDemo && Boolean(account.inquiry_slug);
  const admin = createServiceRoleClient();
  let candidate = base;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let query = admin
      .from("accounts")
      .update({ inquiry_slug: candidate })
      .eq("id", accountId);
    if (!overwriteLeakedDemoSlug) {
      query = query.is("inquiry_slug", null);
    }

    const { error: updateError } = await query;

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
