import type { PillVariant } from "@/components/ui/pill";

/**
 * Content bank platforms — one Bank tab per platform in the source Sheet.
 * TikTok is Idea | Type | Script (uses `type`). Facebook / LinkedIn /
 * YouTube are Idea | Format | Content (use `format`). Pinterest is
 * Idea | Pin Title | Pin Description (uses `title`). Instagram remains
 * in the type for leftover bank rows but is not shown as a tab.
 * Reddit (ADMIN-AUD-00) is a maintained list of threads to comment on
 * (idea = title, notes = subreddit, body = why it's relevant).
 */
export type ContentPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "pinterest"
  | "linkedin"
  | "youtube"
  | "reddit";

export const CONTENT_PLATFORMS: {
  key: ContentPlatform;
  label: string;
  usesType: boolean;
  usesFormat: boolean;
  usesTitle: boolean;
  bodyLabel: string;
}[] = [
  { key: "tiktok", label: "TikTok", usesType: true, usesFormat: false, usesTitle: false, bodyLabel: "Script" },
  { key: "instagram", label: "Instagram", usesType: false, usesFormat: true, usesTitle: false, bodyLabel: "Content" },
  { key: "facebook", label: "Facebook", usesType: false, usesFormat: true, usesTitle: false, bodyLabel: "Content" },
  { key: "pinterest", label: "Pinterest", usesType: false, usesFormat: false, usesTitle: true, bodyLabel: "Pin description" },
  { key: "linkedin", label: "LinkedIn", usesType: false, usesFormat: true, usesTitle: false, bodyLabel: "Post copy" },
  { key: "reddit", label: "Reddit", usesType: false, usesFormat: false, usesTitle: false, bodyLabel: "Why it's relevant" },
  { key: "youtube", label: "YouTube", usesType: false, usesFormat: true, usesTitle: false, bodyLabel: "Content" },
];

export type ContentType = "A" | "B" | "C" | "D";

/**
 * The Sheet's own A/B/C/D colors (green/blue/purple/orange) don't map to
 * this app's palette — remapped to real brand tokens instead. Keep this
 * mapping; don't revert to the Sheet's literal colors.
 */
export const CONTENT_TYPE_META: Record<
  ContentType,
  { label: string; pill: PillVariant; dotVar: string }
> = {
  A: { label: "A — Pure tip", pill: "sage", dotVar: "var(--sage)" },
  B: { label: "B — Story, no plug", pill: "clay", dotVar: "var(--clay)" },
  C: { label: "C — Story + soft plug", pill: "accent", dotVar: "var(--accent)" },
  D: { label: "D — Direct promo", pill: "rosewood", dotVar: "var(--rosewood)" },
};

/**
 * Schedule tri-state columns — Couples-facing (c) then Planner-facing + Ops (p).
 * Origins: TikTok / Pin (couples), LinkedIn (planner). FB / YT are republish
 * checks of those origins, split by audience so a couples TikTok and a planner
 * LinkedIn video do not share a checkbox. Distinct keys from CONTENT_PLATFORMS
 * (bank uses `facebook` / `youtube`; schedule uses `fbCouples` / `ytCouples` /
 * `fbPlanner` / `ytPlanner`). outreach has no bank tab. schedule_days.platforms
 * is jsonb so this list can change without a table rewrite.
 */
export const SCHEDULE_PLATFORM_COLS: {
  key: string;
  label: string;
  group: "c" | "p";
}[] = [
  { key: "tiktok", label: "TikTok", group: "c" },
  { key: "pinterest", label: "Pin", group: "c" },
  { key: "fbCouples", label: "FB", group: "c" },
  { key: "ytCouples", label: "YT", group: "c" },
  { key: "linkedin", label: "LinkedIn", group: "p" },
  { key: "fbPlanner", label: "FB", group: "p" },
  { key: "ytPlanner", label: "YT", group: "p" },
  { key: "reddit", label: "Reddit", group: "p" },
  { key: "outreach", label: "Outreach", group: "p" },
];

export type DayCellStatus = "pending" | "done" | "off";
export type DayPlatforms = Record<string, DayCellStatus>;
