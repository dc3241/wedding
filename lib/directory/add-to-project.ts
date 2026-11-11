import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectoryListing } from "@/lib/directory/data";

/**
 * Copy a directory listing into the couple's account-scoped vendors rolodex
 * (with listing_id) and link it to their project as "to contact".
 * Idempotent: re-tapping Reach out never duplicates the vendor or the link.
 * RLS authorizes every write; nothing here is service-role.
 */
export async function addListingToProject(
  supabase: SupabaseClient,
  args: { accountId: string; projectId: string; listing: DirectoryListing },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { accountId, projectId, listing } = args;

  const { data: existing } = await supabase
    .from("vendors")
    .select("id")
    .eq("account_id", accountId)
    .eq("listing_id", listing.id)
    .limit(1)
    .maybeSingle();

  let vendorId = existing?.id as string | undefined;

  if (!vendorId) {
    const { data: created, error } = await supabase
      .from("vendors")
      .insert({
        account_id: accountId,
        source: "directory",
        name: listing.name,
        category: listing.category,
        website: listing.website,
        service_area: [listing.city, listing.state].filter(Boolean).join(", ") || null,
        listing_id: listing.id,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: error?.message ?? "Could not save the venue." };
    }
    vendorId = created.id as string;
  }

  const { data: link } = await supabase
    .from("project_vendors")
    .select("id")
    .eq("project_id", projectId)
    .eq("vendor_id", vendorId)
    .limit(1)
    .maybeSingle();

  if (!link) {
    const { error } = await supabase.from("project_vendors").insert({
      project_id: projectId,
      vendor_id: vendorId,
      status: "to_contact",
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
