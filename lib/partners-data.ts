import "server-only";

import type { PartnerCard } from "@/lib/partners";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

/** Active partner cards for a placement. Never includes the destination url. */
export async function getPartnersFor(placement: string): Promise<PartnerCard[]> {
  const { data, error } = await createAnonServerClient().rpc("partner_links_for", {
    p_placement: placement,
  });
  if (error) {
    // Before the migration is pasted this simply renders nothing.
    console.error("partner_links_for:", error.message);
    return [];
  }
  return (data ?? []) as PartnerCard[];
}

/** Active cards by slug, for [[partner:slug]] lines inside articles. */
export async function getPartnersBySlugs(slugs: string[]): Promise<Record<string, PartnerCard>> {
  if (!slugs.length) return {};
  const { data, error } = await createAnonServerClient().rpc("partner_links_by_slugs", {
    p_slugs: slugs.slice(0, 20),
  });
  if (error) {
    console.error("partner_links_by_slugs:", error.message);
    return {};
  }
  return Object.fromEntries(((data ?? []) as PartnerCard[]).map((c) => [c.slug, c]));
}
