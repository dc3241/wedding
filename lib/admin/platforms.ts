import type { PillVariant } from "@/components/ui/pill";

/**
 * Content bank platforms — one Bank tab per platform in the source Sheet.
 * TikTok is Idea | Type | Script (uses `type`). Instagram / Facebook /
 * LinkedIn are Idea | Format | Content (use `format`). Pinterest is
 * Idea | Pin Title | Pin Description (uses `title`). YouTube has no rows
 * yet (channel not live) but is a valid platform to file ideas under.
 */
export type ContentPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "pinterest"
  | "linkedin"
  | "youtube";

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
 * Schedule tri-state columns — Couples-facing (c) then
 * Planner-facing + Ops (p). Distinct key set from CONTENT_PLATFORMS
 * (fbPage/fbGroups split, plus reddit/outreach with no content-bank
 * equivalent) — schedule_days.platforms is jsonb precisely so this list
 * can change without a migration.
 */
export const SCHEDULE_PLATFORM_COLS: {
  key: string;
  label: string;
  group: "c" | "p";
}[] = [
  { key: "tiktok", label: "TikTok", group: "c" },
  { key: "ig", label: "IG", group: "c" },
  { key: "fbPage", label: "FB Page", group: "c" },
  { key: "fbGroups", label: "FB Groups", group: "c" },
  { key: "pinterest", label: "Pin", group: "c" },
  { key: "linkedin", label: "LinkedIn", group: "p" },
  { key: "reddit", label: "Reddit", group: "p" },
  { key: "youtube", label: "YouTube", group: "p" },
  { key: "outreach", label: "Outreach", group: "p" },
];

export type DayCellStatus = "pending" | "done" | "off";
export type DayPlatforms = Record<string, DayCellStatus>;
