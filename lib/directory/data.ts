import "server-only";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type DirectoryListing = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  state: string;
  venue_type: string | null;
  website: string | null;
  verified: boolean;
  claimed: boolean;
};

/** Public reads go through definer RPCs only (anon surface #12). */
export async function getStateCounts(): Promise<Record<string, number>> {
  const { data, error } = await createAnonServerClient().rpc("directory_state_counts");
  if (error) {
    console.error("directory_state_counts:", error.message);
    return {};
  }
  return Object.fromEntries(
    (data ?? []).map((r: { state: string; listing_count: number }) => [
      r.state,
      Number(r.listing_count),
    ]),
  );
}

export async function getListingsByState(
  stateCode: string,
  category = "venue",
): Promise<DirectoryListing[]> {
  const { data, error } = await createAnonServerClient().rpc("directory_listings_by_state", {
    p_state: stateCode,
    p_category: category,
  });
  if (error) {
    console.error("directory_listings_by_state:", error.message);
    return [];
  }
  return (data ?? []) as DirectoryListing[];
}

export async function getListingBySlug(slug: string): Promise<DirectoryListing | null> {
  const { data, error } = await createAnonServerClient().rpc("directory_listing_by_slug", {
    p_slug: slug,
  });
  if (error) {
    console.error("directory_listing_by_slug:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as DirectoryListing | undefined) ?? null;
}

export async function getPublishedSlugs(): Promise<{ slug: string; state: string }[]> {
  const { data, error } = await createAnonServerClient().rpc("directory_published_slugs");
  if (error) {
    console.error("directory_published_slugs:", error.message);
    return [];
  }
  return (data ?? []) as { slug: string; state: string }[];
}
