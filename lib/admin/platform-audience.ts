import {
  SCHEDULE_PLATFORM_COLS,
  type ContentPlatform,
} from "@/lib/admin/platforms";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";

export type AudienceGroup = "couples" | "planner";

/**
 * Bank keys that are not also schedule keys. Schedule uses `fbCouples` /
 * `ytCouples` / `fbPlanner` / `ytPlanner`; the bank uses `facebook` /
 * `youtube` as republish filing tabs in BOTH audience banks.
 * Instagram is retired from origination; leftover bank rows still map here
 * so they do not vanish from queries.
 */
const BANK_KEY_ALIASES: Record<string, AudienceGroup> = {
  instagram: "couples",
  facebook: "couples",
  youtube: "planner",
};

export function audienceForPlatform(
  platform: string,
): AudienceGroup | null {
  const col = SCHEDULE_PLATFORM_COLS.find((c) => c.key === platform);
  if (col) return col.group === "c" ? "couples" : "planner";
  return BANK_KEY_ALIASES[platform] ?? null;
}

/** Queue origins lock audience. Instagram is legacy and not locked in the UI. */
export function lockedAudienceForPlatform(
  platform: ContentQueuePlatform | null,
): AudienceGroup | null {
  if (platform === "tiktok" || platform === "pinterest") return "couples";
  if (platform === "linkedin") return "planner";
  return null;
}

export function itemInAudienceBank(
  item: { audience_group: AudienceGroup | null; platform: string },
  audience: AudienceGroup,
): boolean {
  if (item.audience_group) return item.audience_group === audience;
  return audienceForPlatform(item.platform) === audience;
}

/** Couples bank: TikTok + Pin origins, FB/YT republish filing. */
export const COUPLES_BANK_PLATFORMS: ContentPlatform[] = [
  "tiktok",
  "pinterest",
  "facebook",
  "youtube",
];

/** Planner bank: LinkedIn + Reddit origins, FB/YT republish filing. */
export const PLANNER_BANK_PLATFORMS: ContentPlatform[] = [
  "linkedin",
  "facebook",
  "youtube",
  "reddit",
];
