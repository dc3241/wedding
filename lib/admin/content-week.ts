import { adminToday } from "@/lib/admin/today";
import type { ContentPostFormat } from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";

/** Couples lanes plus one LinkedIn post with a square image for venues and planners. */
export type ContentLane = "video" | "slideshow" | "pin" | "linkedin";
export type ContentIntent = "tip" | "promo";
/** Video slots accept either intent. LinkedIn, slideshows, and pins are fixed. */
export type SlotIntent = ContentIntent | "open";

export const CONTENT_LANES: ContentLane[] = ["video", "slideshow", "pin", "linkedin"];

export const LANE_LABEL: Record<ContentLane, string> = {
  video: "TikTok videos",
  slideshow: "TikTok slideshows",
  pin: "Pins",
  linkedin: "LinkedIn",
};

export const LANE_QUOTA_HINT: Record<ContentLane, string> = {
  video: "Two a day. The first is a duet, the second is straight to camera. Also post them to Facebook.",
  slideshow: "Pick 1 tip and 1 second post. Monday, Wednesday, and Friday that post is a list: real advice, one light mention of First Look, and a screen on the slides that show that job. Other days it is a pain, then the app.",
  pin: "Pick 2 tips and 1 promo. All three also go to Facebook.",
  linkedin: "Pick 1. Venues and planners only. One square image. Every post is a problem the product handles, including the couple working in that wedding.",
};

/** Lanes that still get a Sunday shortlist. Videos are assigned on the schedule. */
export const IDEATION_LANES: ContentLane[] = ["slideshow", "pin", "linkedin"];

/**
 * Couple workspace tabs a TikTok can plug, in rotation order.
 * Notes & files stays off this list.
 */
export const VIDEO_FEATURES = [
  { key: "overview", label: "Overview" },
  { key: "calendar", label: "Calendar" },
  { key: "checklist", label: "Checklist" },
  { key: "budget", label: "Budget" },
  { key: "vendors", label: "Vendors" },
  { key: "guests", label: "Guests" },
  { key: "website", label: "Website" },
  { key: "seating", label: "Seating" },
  { key: "timeline", label: "Day-of timeline" },
  { key: "contracts", label: "Contracts" },
] as const;

export type VideoFeatureKey = (typeof VIDEO_FEATURES)[number]["key"];
export type VideoFormat = "duet" | "straight";

const VIDEO_FEATURE_KEYS = new Set<string>(VIDEO_FEATURES.map((feature) => feature.key));

export function isVideoFeatureKey(value: unknown): value is VideoFeatureKey {
  return typeof value === "string" && VIDEO_FEATURE_KEYS.has(value);
}

export function videoFeatureByKey(key: string | null | undefined) {
  if (!key) return null;
  return VIDEO_FEATURES.find((feature) => feature.key === key) ?? null;
}

/** Slot 1 is the duet. Slot 2 is the straight-to-camera video. */
export function videoFormat(position: number): VideoFormat {
  return position === 1 ? "duet" : "straight";
}

export function videoFormatLabel(format: VideoFormat): string {
  return format === "duet" ? "Duet" : "Straight";
}

export function videoSlotTitle(position: number, featureKey: string | null): string {
  const format = videoFormatLabel(videoFormat(position));
  const feature = videoFeatureByKey(featureKey);
  return feature ? `${format} · ${feature.label}` : `Video ${position}`;
}

export function videoFormatLine(position: number, featureKey: string | null): string {
  const label = videoFeatureByKey(featureKey)?.label;
  if (!label) {
    return videoFormat(position) === "duet"
      ? "Duet. The tab rotation starts on the next video."
      : "Straight to camera. The tab rotation starts on the next video.";
  }
  if (videoFormat(position) === "duet") {
    return `Find a complaint TikTok, duet it, and screen-record ${label} with a voiceover.`;
  }
  return `Open on the pain, then show ${label}.`;
}

/** Keys for the next `count` unassigned videos, continuing after `assignedCount`. */
export function nextVideoFeatureKeys(assignedCount: number, count: number): VideoFeatureKey[] {
  return Array.from(
    { length: count },
    (_, index) => VIDEO_FEATURES[(assignedCount + index) % VIDEO_FEATURES.length]!.key,
  );
}

export type SlotSpec = { position: number; intent: SlotIntent };

const LANE_SPECS: Record<Exclude<ContentLane, "linkedin">, SlotSpec[]> = {
  video: [
    { position: 1, intent: "open" },
    { position: 2, intent: "open" },
  ],
  slideshow: [
    { position: 1, intent: "tip" },
    { position: 2, intent: "promo" },
  ],
  pin: [
    { position: 1, intent: "tip" },
    { position: 2, intent: "tip" },
    { position: 3, intent: "promo" },
  ],
};

export type LaneProduction = {
  platform: ContentQueuePlatform;
  format: ContentPostFormat;
  audience_group: AudienceGroup;
  carousel_slides: number | null;
};

export function laneProduction(lane: ContentLane): LaneProduction {
  switch (lane) {
    case "video":
      return {
        platform: "tiktok",
        format: "ugc",
        audience_group: "couples",
        carousel_slides: null,
      };
    case "slideshow":
      return {
        platform: "tiktok",
        format: "carousel",
        audience_group: "couples",
        carousel_slides: 5,
      };
    case "pin":
      return {
        platform: "pinterest",
        format: "pin",
        audience_group: "couples",
        carousel_slides: null,
      };
    case "linkedin":
      return {
        platform: "linkedin",
        format: "static",
        audience_group: "planner",
        carousel_slides: null,
      };
  }
}

export function isContentLane(value: unknown): value is ContentLane {
  return value === "video" || value === "slideshow" || value === "pin" || value === "linkedin";
}

export function isContentIntent(value: unknown): value is ContentIntent {
  return value === "tip" || value === "promo";
}

export function isSlotIntent(value: unknown): value is SlotIntent {
  return value === "tip" || value === "promo" || value === "open";
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, from a YYYY-MM-DD calendar date. */
export function weekdayIndex(iso: string): number {
  return parseIso(iso).getUTCDay();
}

/**
 * The Monday–Saturday board to work on.
 * Sunday prepares the week that starts tomorrow. Mon–Sat stay on this week.
 */
export function postingWeekMonday(today = adminToday()): string {
  const dow = weekdayIndex(today);
  if (dow === 0) return addDays(today, 1);
  return addDays(today, 1 - dow);
}

/** Monday through Saturday of the posting week. */
export function postingDates(weekMonday: string): string[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekMonday, i));
}

/** LinkedIn is a product post every day. Couples lanes still mix tip and promo. */
export function linkedInIntent(_iso: string): ContentIntent {
  return "promo";
}

/** Monday, Wednesday, and Friday the slideshow's second post is a list. */
export function slideshowSecond(iso: string): "list" | "promo" {
  return weekdayIndex(iso) % 2 === 1 ? "list" : "promo";
}

export function slotsForLane(lane: ContentLane, iso: string): SlotSpec[] {
  if (lane === "linkedin") {
    return [{ position: 1, intent: linkedInIntent(iso) }];
  }
  return LANE_SPECS[lane];
}

export function parseWeekStart(value: string | undefined, today = adminToday()): string {
  const fallback = postingWeekMonday(today);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  if (weekdayIndex(value) !== 1) return fallback;
  return value;
}

export function slotLabel(lane: ContentLane, position: number, intent: SlotIntent): string {
  if (lane === "video") return `Video ${position}`;
  if (lane === "slideshow") return intent === "promo" ? "Slideshow · promo" : "Slideshow · tip";
  if (lane === "pin") {
    return intent === "promo" ? `Pin ${position} · promo` : `Pin ${position} · tip`;
  }
  return "LinkedIn";
}

export function formatDayHeading(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekRange(weekMonday: string): string {
  const saturday = addDays(weekMonday, 5);
  const start = parseIso(weekMonday).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = parseIso(saturday).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
}

export function slotAllowsFacebook(lane: ContentLane): boolean {
  return lane === "video" || lane === "pin";
}

export type ContentSlot = {
  id: string;
  week_start: string;
  slot_date: string;
  lane: ContentLane;
  intent: SlotIntent;
  position: number;
  idea_id: string | null;
  feature_key: string | null;
  filmed_at: string | null;
  posted_at: string | null;
  fb_posted_at: string | null;
};

export type IdeaDraft = {
  ready: boolean;
  pending: boolean;
};
