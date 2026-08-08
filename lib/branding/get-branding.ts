import "server-only";
import type { ProjectBranding } from "@/lib/branding/types";
import { createClient } from "@/utils/supabase/server";

/**
 * Resolves white-label branding for a project the caller can access.
 * Returns null when white-label is off, the owner isn't business, or
 * the caller can't access the project (empty RPC result — not an error).
 */
export async function getBrandingForProject(
  projectId: string,
): Promise<ProjectBranding | null> {
  if (!projectId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_project_branding", {
    p_project_id: projectId,
  });

  if (error || !data?.length) {
    return null;
  }

  const row = data[0] as {
    brand_name: string | null;
    brand_logo_url: string | null;
    brand_accent_color: string | null;
  };

  return {
    brandName: row.brand_name,
    brandLogoUrl: row.brand_logo_url,
    brandAccentColor: row.brand_accent_color,
  };
}

/** Extract `/projects/{uuid}` from a pathname (middleware `x-pathname`). */
export function projectIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(
    /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$|\?)/i,
  );
  return match?.[1] ?? null;
}
