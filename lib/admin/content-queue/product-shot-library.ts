import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";

/** One uploaded screenshot per product angle, under content-queue-assets. */
export const PRODUCT_SHOT_LIBRARY_PREFIX = "product-library";

/** Matches the content-queue-assets bucket cap. */
export const MAX_PRODUCT_SHOT_BYTES = 20 * 1024 * 1024;

export const PRODUCT_SHOT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const PRODUCT_SHOT_INPUT_ACCEPT = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export { CONTENT_QUEUE_BUCKET };

export function productShotExtension(fileName: string, contentType: string): string | null {
  if (contentType === "image/png" || /\.png$/i.test(fileName)) return "png";
  if (contentType === "image/webp" || /\.webp$/i.test(fileName)) return "webp";
  if (contentType === "image/jpeg" || /\.jpe?g$/i.test(fileName)) return "jpg";
  return null;
}

export function productShotMime(fileName: string, contentType: string): string | null {
  const ext = productShotExtension(fileName, contentType);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg") return "image/jpeg";
  return null;
}

export function validateProductShotFile(file: File): string | null {
  if (file.size > MAX_PRODUCT_SHOT_BYTES) {
    return "File is too large. Maximum size is 20MB.";
  }
  if (!productShotExtension(file.name, file.type)) {
    return "Use a PNG, JPG, or WebP.";
  }
  return null;
}

export function buildProductShotStoragePath(surface: string, fileName: string, contentType: string): string {
  const ext = productShotExtension(fileName, contentType);
  if (!ext) throw new Error("Use a PNG, JPG, or WebP.");
  return `${PRODUCT_SHOT_LIBRARY_PREFIX}/${surface}/${crypto.randomUUID()}.${ext}`;
}
