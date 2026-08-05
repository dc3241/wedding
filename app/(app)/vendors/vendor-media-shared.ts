export const VENDOR_MEDIA_BUCKET = "vendor-media";

/** Signed-URL TTL — matches project-files getDownloadUrl (components/files/actions.ts). */
export const VENDOR_MEDIA_SIGNED_TTL_SECONDS = 60;

export const MAX_VENDOR_IMAGE_BYTES = 26_214_400; // 25 MB — match website-media

export const VENDOR_IMAGE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.heic,image/png,image/jpeg,image/webp,image/heic";
