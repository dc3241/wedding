import "server-only";
import type { ProjectBranding } from "@/lib/branding/types";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type InquiryBrandingResult =
  | { accountFound: false }
  | { accountFound: true; branding: ProjectBranding | null };

type InquiryBrandingRow = {
  account_found: boolean;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_accent_color: string | null;
};

function hasBrandFields(row: InquiryBrandingRow): boolean {
  return Boolean(
    row.brand_name?.trim() ||
      row.brand_logo_url?.trim() ||
      row.brand_accent_color?.trim(),
  );
}

/**
 * Public (anon) branding + slug existence for /inquire/[slug].
 * account_found = false → invalid-slug UI. Brand fields are only
 * populated when white_label_enabled is on; otherwise branding is null.
 */
export async function getInquiryBranding(
  slug: string,
): Promise<InquiryBrandingResult> {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("get_inquiry_branding", {
    p_slug: slug,
  });

  if (error || data == null) {
    return { accountFound: true, branding: null };
  }

  const row = (
    Array.isArray(data) ? data[0] : data
  ) as InquiryBrandingRow | undefined;

  if (!row || row.account_found !== true) {
    return { accountFound: false };
  }

  if (!hasBrandFields(row)) {
    return { accountFound: true, branding: null };
  }

  return {
    accountFound: true,
    branding: {
      brandName: row.brand_name,
      brandLogoUrl: row.brand_logo_url,
      brandAccentColor: row.brand_accent_color,
    },
  };
}
