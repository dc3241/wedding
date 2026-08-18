import "server-only";

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugifyInquiryName } from "@/lib/inquiry/parse";

/**
 * Lazy-generate accounts.inquiry_slug on first relevant use.
 * Never populates personal accounts.
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

  if (error) throw new Error(error.message);
  if (!account || account.kind !== "business") return null;
  if (account.inquiry_slug) return account.inquiry_slug;

  const base = slugifyInquiryName(account.name);
  let candidate = base;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error: updateError } = await supabase
      .from("accounts")
      .update({ inquiry_slug: candidate })
      .eq("id", accountId)
      .is("inquiry_slug", null);

    if (!updateError) {
      const { data: saved } = await supabase
        .from("accounts")
        .select("inquiry_slug")
        .eq("id", accountId)
        .maybeSingle();
      return saved?.inquiry_slug ?? candidate;
    }

    if (updateError.code !== "23505") {
      throw new Error(updateError.message);
    }

    candidate = `${base}-${randomBytes(2).toString("hex")}`;
  }

  throw new Error("Could not allocate an inquiry slug.");
}
