export const CONTENT_QUEUE_BUCKET = "content-queue-assets";

/** Same 60s window as getMediaDownloadUrl / vendor portfolio thumbs. */
export const CONTENT_QUEUE_SIGNED_TTL_SECONDS = 60;

export type ContentQueuePlatform = "instagram" | "tiktok" | "pinterest" | "linkedin";
export type ContentQueueStatus = "pending" | "approved" | "denied";

const ALL_CONTENT_QUEUE_PLATFORMS: {
  key: ContentQueuePlatform;
  label: string;
  aspectClass: string;
}[] = [
  { key: "tiktok", label: "TikTok", aspectClass: "aspect-[9/16]" },
  { key: "instagram", label: "Instagram", aspectClass: "aspect-[4/5]" },
  { key: "pinterest", label: "Pinterest", aspectClass: "aspect-[2/3]" },
  { key: "linkedin", label: "LinkedIn", aspectClass: "aspect-square" },
];

/** Origins Friday still produces. Instagram stays in the type for historical rows. */
export const CONTENT_QUEUE_PLATFORMS = ALL_CONTENT_QUEUE_PLATFORMS.filter(
  (p) => p.key !== "instagram",
);

/** Statuses still shown in the review inbox. Approved rows leave for the bank. */
export const CONTENT_QUEUE_STATUSES: {
  key: Exclude<ContentQueueStatus, "approved">;
  label: string;
}[] = [
  { key: "pending", label: "Pending" },
  { key: "denied", label: "Denied" },
];

export function contentQueuePlatformMeta(key: ContentQueuePlatform) {
  return ALL_CONTENT_QUEUE_PLATFORMS.find((p) => p.key === key)!;
}

export function isContentQueuePlatform(
  value: unknown,
): value is ContentQueuePlatform {
  return ALL_CONTENT_QUEUE_PLATFORMS.some((p) => p.key === value);
}

export function isActiveContentQueuePlatform(
  value: unknown,
): value is Exclude<ContentQueuePlatform, "instagram"> {
  return CONTENT_QUEUE_PLATFORMS.some((p) => p.key === value);
}

/** Videos and pins are cross-posted to Facebook. YouTube reuses the TikTok video. */
export function queueRepublishHint(platform: ContentQueuePlatform): string | null {
  if (platform === "tiktok" || platform === "pinterest") {
    return "Also post to Facebook";
  }
  return null;
}
