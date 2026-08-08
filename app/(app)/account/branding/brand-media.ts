"use client";

import { createClient } from "@/utils/supabase/client";

export const BRAND_MEDIA_BUCKET = "brand-media";
export const MAX_BRAND_LOGO_BYTES = 5_242_880; // 5 MB

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

const EXT_MIME: Record<string, (typeof ALLOWED_MIME)[number]> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const BRAND_LOGO_ACCEPT =
  ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

function resolveImageMime(file: File): string | null {
  if (file.type && (ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXT_MIME[ext]) return EXT_MIME[ext];
  return null;
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function validateBrandLogo(file: File): string | null {
  if (file.size > MAX_BRAND_LOGO_BYTES) {
    return "Logo is too large. Maximum size is 5 MB.";
  }
  if (!resolveImageMime(file)) {
    return "Use PNG, JPG, or WebP.";
  }
  return null;
}

/**
 * Client upload to the public brand-media bucket.
 * Path: `{accountId}/{uuid}.{ext}` — folder[1] = account_id (RLS).
 * Returns the public URL (no signing).
 */
export async function uploadBrandLogo(
  accountId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const validationError = validateBrandLogo(file);
  if (validationError) return { error: validationError };

  const mimeType = resolveImageMime(file)!;
  const path = `${accountId}/${crypto.randomUUID()}.${extensionForMime(mimeType)}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(BRAND_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from(BRAND_MEDIA_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    return { error: "Could not resolve public URL." };
  }

  return { url: data.publicUrl };
}
