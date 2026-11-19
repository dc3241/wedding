import "server-only";

import { MIN_INDEXABLE_LISTINGS } from "@/lib/directory/categories";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

/** MEDIA-06: per-city directory pages. */
export type DirectoryCity = {
  state: string;
  city: string;
  slug: string;
  total: number;
  byCategory: Record<string, number>;
};

export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Every city with at least one published listing, grouped by state code. */
export async function getDirectoryCities(): Promise<DirectoryCity[]> {
  const { data, error } = await createAnonServerClient().rpc("directory_city_counts");
  if (error) {
    console.error("directory_city_counts:", error.message);
    return [];
  }
  const map = new Map<string, DirectoryCity>();
  for (const r of (data ?? []) as {
    state: string;
    city: string;
    category: string;
    listing_count: number;
  }[]) {
    const slug = citySlug(r.city);
    if (!slug) continue;
    const key = `${r.state}:${slug}`;
    const entry = map.get(key) ?? { state: r.state, city: r.city.trim(), slug, total: 0, byCategory: {} };
    const n = Number(r.listing_count);
    entry.total += n;
    entry.byCategory[r.category] = (entry.byCategory[r.category] ?? 0) + n;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
}

export function isIndexableCity(c: DirectoryCity): boolean {
  return c.total >= MIN_INDEXABLE_LISTINGS;
}
