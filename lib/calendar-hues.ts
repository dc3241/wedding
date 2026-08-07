/**
 * Call-site display vocab for calendar chips (CAL-03).
 * Pure — no Supabase/auth. Mirrors lib/partner-sides.ts.
 * Do not import into components/website/.
 */

/** CSS custom-property names for the categorical hue family in globals.css. */
export const CAL_WEDDING_HUES = [
  "--cal-w-1",
  "--cal-w-2",
  "--cal-w-3",
  "--cal-w-4",
  "--cal-w-5",
] as const;

export type CalWeddingHue = (typeof CAL_WEDDING_HUES)[number];

/** 0045 event_kind CHECK + synthetic overlay buckets (not stored as event_kind). */
export const CALENDAR_KIND_KEYS = [
  "meeting",
  "call",
  "site_visit",
  "tasting",
  "fitting",
  "deadline",
  "other",
  "wedding",
  "task",
  "payment",
] as const;

export type CalendarKindKey = (typeof CALENDAR_KIND_KEYS)[number];

type KindMeta = {
  glyph: string;
  label: string;
  hue: CalWeddingHue;
};

const KIND_META: Record<CalendarKindKey, KindMeta> = {
  meeting: { glyph: "◷", label: "Meeting", hue: "--cal-w-4" },
  call: { glyph: "☎", label: "Call", hue: "--cal-w-1" },
  site_visit: { glyph: "⌖", label: "Site visit", hue: "--cal-w-2" },
  tasting: { glyph: "✦", label: "Tasting", hue: "--cal-w-3" },
  fitting: { glyph: "✂", label: "Fitting", hue: "--cal-w-5" },
  deadline: { glyph: "⚑", label: "Deadline", hue: "--cal-w-5" },
  other: { glyph: "·", label: "Other", hue: "--cal-w-4" },
  wedding: { glyph: "♡", label: "Wedding day", hue: "--cal-w-5" },
  task: { glyph: "✓", label: "Task due", hue: "--cal-w-2" },
  payment: { glyph: "$", label: "Payment due", hue: "--cal-w-3" },
};

/** Legend entries in stable display order (0045 kinds, then overlay buckets). */
export const CALENDAR_KIND_LEGEND: ReadonlyArray<{
  key: CalendarKindKey;
  glyph: string;
  label: string;
}> = CALENDAR_KIND_KEYS.map((key) => ({
  key,
  glyph: KIND_META[key].glyph,
  label: KIND_META[key].label,
}));

/**
 * Stable hash of a project UUID → categorical hue CSS var NAME.
 * Deterministic across sessions; not stored.
 */
export function weddingHue(projectId: string): CalWeddingHue {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return CAL_WEDDING_HUES[hash % CAL_WEDDING_HUES.length]!;
}

function asKindKey(eventKind: string): CalendarKindKey | null {
  return (CALENDAR_KIND_KEYS as readonly string[]).includes(eventKind)
    ? (eventKind as CalendarKindKey)
    : null;
}

/** Categorical hue CSS var NAME for a kind (0045 or synthetic overlay). */
export function kindHue(eventKind: string): string {
  const key = asKindKey(eventKind);
  if (!key) return "--cal-w-4";
  return KIND_META[key].hue;
}

export function kindGlyph(eventKind: string): string {
  const key = asKindKey(eventKind);
  if (!key) return "?";
  return KIND_META[key].glyph;
}

export function kindLabel(eventKind: string): string {
  const key = asKindKey(eventKind);
  if (!key) return eventKind;
  return KIND_META[key].label;
}
