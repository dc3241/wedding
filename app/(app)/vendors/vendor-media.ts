"use client";

import { createClient } from "@/utils/supabase/client";
import {
  MAX_VENDOR_IMAGE_BYTES,
  VENDOR_MEDIA_BUCKET,
} from "@/app/(app)/vendors/vendor-media-shared";

export {
  MAX_VENDOR_IMAGE_BYTES,
  VENDOR_IMAGE_ACCEPT,
  VENDOR_MEDIA_BUCKET,
  VENDOR_MEDIA_SIGNED_TTL_SECONDS,
} from "@/app/(app)/vendors/vendor-media-shared";

const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
] as const;

const EXT_MIME: Record<string, (typeof ALLOWED_MIME)[number]> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
};

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
  if (mime === "image/heic") return "heic";
  return "jpg";
}

export function validateVendorImage(file: File): string | null {
  if (file.size > MAX_VENDOR_IMAGE_BYTES) {
    return "Image is too large. Maximum size is 25 MB.";
  }
  if (!resolveImageMime(file)) {
    return "Use PNG, JPG, WebP, or HEIC.";
  }
  return null;
}

/**
 * Client upload to the private vendor-media bucket.
 * Path: `{accountId}/{vendorId}/{uuid}.{ext}` — folder[1] = account_id (RLS).
 * Returns the storage path (no public URL). Caller must refresh to re-list + sign.
 */
export async function uploadVendorImage(
  accountId: string,
  vendorId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const validationError = validateVendorImage(file);
  if (validationError) return { error: validationError };

  const mimeType = resolveImageMime(file)!;
  const path = `${accountId}/${vendorId}/${crypto.randomUUID()}.${extensionForMime(mimeType)}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  return { path };
}
