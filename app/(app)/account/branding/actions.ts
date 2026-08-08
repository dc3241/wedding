"use server";

import { revalidatePath } from "next/cache";
import {
  BRAND_ACCENT_HEX,
  BRAND_NAME_MAX_LENGTH,
} from "@/lib/branding/types";
import { createClient } from "@/utils/supabase/server";

export type UpdateAccountBrandingInput = {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandAccentColor: string | null;
  whiteLabelEnabled: boolean;
};

export type UpdateAccountBrandingResult =
  | { ok: true }
  | { ok: false; error: string };

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateAccountBranding(
  accountId: string,
  input: UpdateAccountBrandingInput,
): Promise<UpdateAccountBrandingResult> {
  if (!accountId) {
    return { ok: false, error: "Account is required." };
  }

  const brandName = trimOrNull(input.brandName);
  if (brandName && brandName.length > BRAND_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Business name must be ${BRAND_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  const brandAccentColor = trimOrNull(input.brandAccentColor);
  if (brandAccentColor && !BRAND_ACCENT_HEX.test(brandAccentColor)) {
    return {
      ok: false,
      error: "Accent color must be a 6-digit hex value (e.g. #C0396B).",
    };
  }

  const brandLogoUrl = trimOrNull(input.brandLogoUrl);

  const supabase = await createClient();

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_account_member",
    { p_account_id: accountId },
  );

  if (memberError) {
    return { ok: false, error: memberError.message };
  }

  if (!isMember) {
    return { ok: false, error: "You don't have access to this account." };
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      brand_name: brandName,
      brand_logo_url: brandLogoUrl,
      brand_accent_color: brandAccentColor,
      white_label_enabled: input.whiteLabelEnabled,
    })
    .eq("id", accountId);

  if (error) {
    if (error.message.includes("accounts_white_label_business_only")) {
      return {
        ok: false,
        error: "White-label branding is only available on business accounts.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/account/branding");
  revalidatePath("/", "layout");
  revalidatePath("/projects", "layout");

  return { ok: true };
}
