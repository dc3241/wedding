import { parseWeddingWebsiteContent } from "@/components/website/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Best-effort address string for Places text search near this project.
 * Order: website ceremony/reception address → booked venue address → profile location.
 */
export async function resolveProjectLocationHint(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string | null> {
  const { data: website } = await supabase
    .from("wedding_websites")
    .select("content")
    .eq("project_id", projectId)
    .maybeSingle();

  if (website) {
    const content = parseWeddingWebsiteContent(website.content);
    const ceremony = content.details.ceremonyAddress.trim();
    if (ceremony) return ceremony;
    const reception = content.details.receptionAddress.trim();
    if (reception) return reception;
  }

  const { data: bookedLinks } = await supabase
    .from("project_vendors")
    .select("vendors(address, category)")
    .eq("project_id", projectId)
    .eq("status", "booked");

  for (const link of bookedLinks ?? []) {
    const vendor = unwrapVendor(link.vendors);
    if (!vendor || vendor.category !== "venue") continue;
    const address = vendor.address?.trim();
    if (address) return address;
  }

  const { data: profile } = await supabase
    .from("wedding_profile")
    .select("location")
    .eq("project_id", projectId)
    .maybeSingle();

  const location = profile?.location?.trim();
  return location || null;
}

function unwrapVendor(
  raw: unknown,
): { address: string | null; category: string | null } | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const vendor = row as { address?: string | null; category?: string | null };
  return {
    address: vendor.address ?? null,
    category: vendor.category ?? null,
  };
}
