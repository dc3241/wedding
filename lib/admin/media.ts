export const ADMIN_MEDIA_BUCKET = "admin-media";

/** Product decision (2026-09-03): 2GB per file. */
export const MAX_MEDIA_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

export const ALLOWED_MEDIA_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/gif",
] as const;

export const MEDIA_INPUT_ACCEPT =
  "video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi,image/png,image/jpeg,image/webp,image/heic,image/gif,.png,.jpg,.jpeg,.webp,.heic,.gif";

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, "_").slice(0, 200);
}

export function buildMediaStoragePath(fileName: string): string {
  const id = crypto.randomUUID();
  return `${id}/${sanitizeFileName(fileName)}`;
}

export function validateMediaFile(file: File): string | null {
  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return "File is too large. Maximum size is 2GB.";
  }
  const okType =
    (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(file.type) ||
    /\.(mp4|mov|webm|avi|png|jpe?g|webp|heic|gif)$/i.test(file.name);
  if (!okType) {
    return "File type not allowed. Use MP4, MOV, WebM, AVI, PNG, JPG, WebP, HEIC, or GIF.";
  }
  return null;
}

export function formatMediaFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Resolve the direct storage hostname Supabase recommends for large
 * (resumable) uploads — {ref}.storage.supabase.co instead of the
 * general {ref}.supabase.co API host. Falls back to the plain API URL
 * if the hostname shape doesn't match a hosted Supabase project
 * (e.g. local dev).
 */
export function resumableUploadEndpoint(supabaseUrl: string): string {
  try {
    const url = new URL(supabaseUrl);
    const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (match) {
      return `https://${match[1]}.storage.supabase.co/storage/v1/upload/resumable`;
    }
    return `${url.origin}/storage/v1/upload/resumable`;
  } catch {
    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
  }
}
