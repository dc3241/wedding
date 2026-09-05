import {
  CONTENT_PLATFORMS,
  SCHEDULE_PLATFORM_COLS,
  type ContentPlatform,
} from "@/lib/admin/platforms";

export type AudienceGroup = "couples" | "planner";

/**
 * Bank keys that are not also schedule keys. Schedule uses `ig` /
 * `fbPage` / `fbGroups`; the bank uses `instagram` / `facebook`.
 * Schedule keys (including reddit, youtube, outreach) are resolved
 * from SCHEDULE_PLATFORM_COLS so this file cannot drift from
 * Overview / Schedule.
 */
const BANK_KEY_ALIASES: Record<string, AudienceGroup> = {
  instagram: "couples",
  facebook: "couples",
};

export function audienceForPlatform(
  platform: string,
): AudienceGroup | null {
  const col = SCHEDULE_PLATFORM_COLS.find((c) => c.key === platform);
  if (col) return col.group === "c" ? "couples" : "planner";
  return BANK_KEY_ALIASES[platform] ?? null;
}

export function bankPlatformsForAudience(
  audience: AudienceGroup,
): ContentPlatform[] {
  return CONTENT_PLATFORMS.filter(
    (p) => audienceForPlatform(p.key) === audience,
  ).map((p) => p.key);
}

export function itemInAudienceBank(
  item: { audience_group: AudienceGroup | null; platform: string },
  audience: AudienceGroup,
): boolean {
  if (item.audience_group) return item.audience_group === audience;
  return audienceForPlatform(item.platform) === audience;
}

export const COUPLES_BANK_PLATFORMS = bankPlatformsForAudience("couples");

/** Planner bank includes IG/TikTok/Pin so queue graphics with a planner angle can file here. */
export const PLANNER_BANK_PLATFORMS: ContentPlatform[] = [
  "tiktok",
  "instagram",
  "pinterest",
  ...bankPlatformsForAudience("planner"),
];
