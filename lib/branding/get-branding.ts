import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
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

/**
 * VENUE-01 own-shell gate — pure account-row read.
 * Returns null unless plan = 'venue' AND white_label_enabled.
 * No cookie / auth lookups — callers supply client + accountId.
 */
async function loadOwnAccountBranding(
  supabase: SupabaseClient,
  accountId: string,
): Promise<ProjectBranding | null> {
  if (!accountId) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "plan, white_label_enabled, brand_name, brand_logo_url, brand_accent_color",
    )
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (data.plan !== "venue" || data.white_label_enabled !== true) {
    return null;
  }

  return {
    brandName: data.brand_name,
    brandLogoUrl: data.brand_logo_url,
    brandAccentColor: data.brand_accent_color,
  };
}

/**
 * Own-shell branding for PlannerShell (VENUE-01).
 * Separate from getBrandingForProject — answers "my account's chrome,"
 * not "a project I'm viewing's owner's chrome."
 * Returns null unless plan = 'venue' AND white_label_enabled.
 */
export async function getOwnAccountBranding(): Promise<ProjectBranding | null> {
  const supabase = await createClient();

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    return null;
  }

  return loadOwnAccountBranding(supabase, accountId);
}

/**
 * Own-shell branding for service-role / cron callers (EMAIL-BRAND-01).
 * Same VENUE-01 gate as getOwnAccountBranding — no cookie session required.
 */
export async function getOwnAccountBrandingForAccount(
  supabase: SupabaseClient,
  accountId: string,
): Promise<ProjectBranding | null> {
  return loadOwnAccountBranding(supabase, accountId);
}

/** Extract `/projects/{uuid}` from a pathname (middleware `x-pathname`). */
export function projectIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(
    /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$|\?)/i,
  );
  return match?.[1] ?? null;
}
