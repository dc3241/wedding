"use client";

import { createClient } from "@/utils/supabase/client";

export const WEBSITE_MEDIA_BUCKET = "website-media";
export const MAX_WEBSITE_IMAGE_BYTES = 26_214_400; // 25 MB — match project-files

export type WebsiteMediaFolder = "hero" | "gallery" | "party";

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

export const WEBSITE_IMAGE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.heic,image/png,image/jpeg,image/webp,image/heic";

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

export function validateWebsiteImage(file: File): string | null {
  if (file.size > MAX_WEBSITE_IMAGE_BYTES) {
    return "Image is too large. Maximum size is 25 MB.";
  }
  if (!resolveImageMime(file)) {
    return "Use PNG, JPG, WebP, or HEIC.";
  }
  return null;
}

/**
 * Client upload to the public website-media bucket.
 * Path: `{projectId}/{folder}/{uuid}.{ext}` — first folder must be project_id (RLS).
 * Returns the public URL (no signing). Does not write content — caller persists.
 */
export async function uploadWebsiteImage(
  projectId: string,
  folder: WebsiteMediaFolder,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const validationError = validateWebsiteImage(file);
  if (validationError) return { error: validationError };

  const mimeType = resolveImageMime(file)!;
  const path = `${projectId}/${folder}/${crypto.randomUUID()}.${extensionForMime(mimeType)}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(WEBSITE_MEDIA_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage
    .from(WEBSITE_MEDIA_BUCKET)
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    return { error: "Could not resolve public URL." };
  }

  return { url: data.publicUrl };
}

/** @deprecated Prefer uploadWebsiteImage(projectId, "hero", file). */
export async function uploadHeroImage(
  projectId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  return uploadWebsiteImage(projectId, "hero", file);
}
