"use server";

import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type AdminListing = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  state: string;
  published: boolean;
  featured_until: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized");
  return supabase;
}

/** Empty query = listings that have (or had) a featured window. */
export async function searchListings(query: string): Promise<AdminListing[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_search_listings", { p_query: query.slice(0, 100) });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminListing[];
}

/** days = null clears the featured window. */
export async function setFeatured(listingId: string, days: number | null): Promise<string | null> {
  const supabase = await requireAdmin();
  const until = days == null ? null : new Date(Date.now() + days * 86400000).toISOString();
  const { error } = await supabase.rpc("admin_set_listing_featured", {
    p_listing_id: listingId,
    p_until: until,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/wedding-vendors/[state]", "page");
  revalidatePath("/wedding-vendors/[state]/photographers", "page");
  revalidatePath("/wedding-vendors/[state]/florists", "page");
  revalidatePath("/wedding-vendors/[state]/dj-music", "page");
  return until;
}
