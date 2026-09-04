export const CONTENT_QUEUE_BUCKET = "content-queue-assets";

/** Same 60s window as getMediaDownloadUrl / vendor portfolio thumbs. */
export const CONTENT_QUEUE_SIGNED_TTL_SECONDS = 60;

export type ContentQueuePlatform = "instagram" | "tiktok" | "pinterest";
export type ContentQueueStatus = "pending" | "approved" | "denied";

export const CONTENT_QUEUE_PLATFORMS: {
  key: ContentQueuePlatform;
  label: string;
  aspectClass: string;
}[] = [
  { key: "tiktok", label: "TikTok", aspectClass: "aspect-[9/16]" },
  { key: "instagram", label: "Instagram", aspectClass: "aspect-[4/5]" },
  { key: "pinterest", label: "Pinterest", aspectClass: "aspect-[2/3]" },
];

export const CONTENT_QUEUE_STATUSES: {
  key: ContentQueueStatus;
  label: string;
}[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
];

export function contentQueuePlatformMeta(key: ContentQueuePlatform) {
  return CONTENT_QUEUE_PLATFORMS.find((p) => p.key === key)!;
}
