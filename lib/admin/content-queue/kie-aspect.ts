/**
 * Seedream 5 Pro createTask `aspect_ratio` enum.
 * Sending anything else fails: "not within the range of allowed options".
 */
export const KIE_ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "2:3",
  "3:2",
  "21:9",
] as const;

export type KieAspectRatio = (typeof KIE_ASPECT_RATIOS)[number];

export type KieImagePlatform = "instagram" | "tiktok" | "pinterest";

/** Closest allowed ratio per platform. IG feed is 4:5; KIE has no 4:5. */
export const PLATFORM_KIE_ASPECT: Record<KieImagePlatform, KieAspectRatio> = {
  instagram: "3:4",
  tiktok: "9:16",
  pinterest: "2:3",
};

const SOCIAL_TO_KIE: Record<string, KieAspectRatio> = {
  "4:5": "3:4",
  "5:4": "4:3",
};

export function isKieAspectRatio(value: string): value is KieAspectRatio {
  return (KIE_ASPECT_RATIOS as readonly string[]).includes(value);
}

/** Map a free-form ratio onto KIE's enum. Unknown values use `fallback`. */
export function toKieAspectRatio(
  value: string,
  fallback: KieAspectRatio,
): KieAspectRatio {
  const trimmed = value.trim();
  if (isKieAspectRatio(trimmed)) return trimmed;
  return SOCIAL_TO_KIE[trimmed] ?? fallback;
}
