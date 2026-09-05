import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";

/** Production format — what Friday should make. Not A/B/C/D (caption flavor). */
export type ContentPostFormat = "static" | "carousel" | "ugc" | "photo" | "pin" | "text";

export const CONTENT_POST_FORMATS: {
  key: ContentPostFormat;
  label: string;
  needsImages: boolean;
}[] = [
  { key: "static", label: "Static", needsImages: true },
  { key: "carousel", label: "Carousel", needsImages: true },
  { key: "ugc", label: "UGC", needsImages: false },
  { key: "photo", label: "Photo", needsImages: true },
  { key: "pin", label: "Pin", needsImages: true },
  { key: "text", label: "Text post", needsImages: false },
];

export const FORMATS_BY_PLATFORM: Record<
  ContentQueuePlatform,
  { key: ContentPostFormat; label: string }[]
> = {
  instagram: [
    { key: "static", label: "Static" },
    { key: "carousel", label: "Carousel" },
    { key: "ugc", label: "UGC / Reel" },
  ],
  tiktok: [
    { key: "ugc", label: "UGC" },
    { key: "photo", label: "Photo" },
  ],
  pinterest: [{ key: "pin", label: "Pin" }],
  linkedin: [{ key: "text", label: "Text post" }],
};

export const AUDIENCE_OPTIONS: { key: AudienceGroup; label: string }[] = [
  { key: "couples", label: "Couples" },
  { key: "planner", label: "Venues & planners" },
];

/** Ideas per Generate click. Enough to like 9–12 after passing some. */
export const IDEATION_GENERATE_COUNT = 15;
export const IDEATION_GENERATE_MIN = 10;
export const IDEATION_GENERATE_MAX = 15;

export const DEFAULT_CAROUSEL_SLIDES = 5;
export const MIN_CAROUSEL_SLIDES = 3;
export const MAX_CAROUSEL_SLIDES = 7;

export function formatMeta(format: ContentPostFormat) {
  return CONTENT_POST_FORMATS.find((f) => f.key === format)!;
}

export function formatNeedsImages(format: ContentPostFormat | null | undefined): boolean {
  if (!format) return true;
  return formatMeta(format).needsImages;
}

export function formatsForPlatform(platform: ContentQueuePlatform) {
  return FORMATS_BY_PLATFORM[platform];
}

export function isFormatForPlatform(
  platform: ContentQueuePlatform,
  format: ContentPostFormat,
): boolean {
  return FORMATS_BY_PLATFORM[platform].some((f) => f.key === format);
}

export function clampCarouselSlides(n: number): number {
  return Math.min(
    MAX_CAROUSEL_SLIDES,
    Math.max(MIN_CAROUSEL_SLIDES, Math.round(n)),
  );
}

export function slideCountFor(
  format: ContentPostFormat | null | undefined,
  slides?: number | null,
): number {
  if (!formatNeedsImages(format)) return 0;
  if (format === "carousel") {
    return clampCarouselSlides(slides ?? DEFAULT_CAROUSEL_SLIDES);
  }
  return 1;
}

export function queueNoImageCopy(format: ContentPostFormat | null | undefined): string {
  if (format === "ugc") return "Film this — no generated image";
  if (format === "text") return "Text post — no generated image";
  return "No generated image";
}

export function formatLabel(format: ContentPostFormat | null | undefined): string {
  if (!format) return "Graphic";
  return formatMeta(format).label;
}

export function isContentPostFormat(value: string | null | undefined): value is ContentPostFormat {
  return CONTENT_POST_FORMATS.some((f) => f.key === value);
}

export function filledImagePaths(paths: string[] | null | undefined): string[] {
  return (paths ?? []).filter((p) => p.trim().length > 0);
}

export function imagesReadyForQueue(args: {
  format: ContentPostFormat | null | undefined;
  carousel_slides?: number | null;
  image_paths: string[] | null | undefined;
}): boolean {
  if (!formatNeedsImages(args.format)) return true;
  const expected = slideCountFor(args.format, args.carousel_slides);
  return filledImagePaths(args.image_paths).length >= expected && expected > 0;
}

export function isIdeaFridayReady(item: {
  rating: "up" | "down" | null;
  platform: ContentQueuePlatform | null;
  format: ContentPostFormat | null;
  audience_group: AudienceGroup | null;
}): boolean {
  return (
    item.rating === "up" &&
    item.platform != null &&
    item.format != null &&
    item.audience_group != null
  );
}

export type IdeaTargetFields = {
  platform: ContentQueuePlatform | null;
  format: ContentPostFormat | null;
  audience_group: AudienceGroup | null;
  carousel_slides: number | null;
};

export function applyIdeaTargetPatch(
  current: IdeaTargetFields,
  patch: Partial<IdeaTargetFields>,
): IdeaTargetFields {
  const platform = patch.platform !== undefined ? patch.platform : current.platform;
  let format = patch.format !== undefined ? patch.format : current.format;
  let audience_group =
    patch.audience_group !== undefined ? patch.audience_group : current.audience_group;

  if (platform === "linkedin") {
    format = "text";
    audience_group = "planner";
  } else if (platform === "pinterest") {
    format = "pin";
  } else if (platform && format && !isFormatForPlatform(platform, format)) {
    format = null;
  } else if (!platform) {
    format = null;
  }

  let carousel_slides =
    patch.carousel_slides !== undefined ? patch.carousel_slides : current.carousel_slides;
  if (format === "carousel") {
    carousel_slides = clampCarouselSlides(carousel_slides ?? DEFAULT_CAROUSEL_SLIDES);
  } else {
    carousel_slides = null;
  }

  return { platform, format, audience_group, carousel_slides };
}
