/** Planner/venue project and lead kind. Couples stay on wedding. */

export const EVENT_TYPES = ["wedding", "event"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const HIDEABLE_TOOLS = [
  "calendar",
  "checklist",
  "budget",
  "vendors",
  "guests",
  "website",
  "seating",
  "timeline",
  "contracts",
  "invoices",
  "agreements",
  "notes",
] as const;

export type HideableTool = (typeof HIDEABLE_TOOLS)[number];

export function isHideableTool(value: unknown): value is HideableTool {
  return (
    typeof value === "string" &&
    (HIDEABLE_TOOLS as readonly string[]).includes(value)
  );
}

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Other event" },
];

export function isEventType(value: unknown): value is EventType {
  return value === "wedding" || value === "event";
}

export function parseEventType(value: unknown): EventType {
  return value === "event" ? "event" : "wedding";
}

export function eventTypeLabel(eventType: EventType): string {
  return eventType === "event" ? "Other event" : "Wedding";
}

/** Seating and the website start off for a non-wedding event. */
export function defaultHiddenTools(eventType: EventType): HideableTool[] {
  return eventType === "event" ? ["website", "seating"] : [];
}

export function parseHiddenTools(value: unknown): HideableTool[] {
  if (!Array.isArray(value)) return [];
  const kept: HideableTool[] = [];
  for (const item of value) {
    if (isHideableTool(item) && !kept.includes(item)) {
      kept.push(item);
    }
  }
  return kept;
}

export function isToolHidden(
  hiddenTools: readonly string[],
  tool: HideableTool,
): boolean {
  return hiddenTools.includes(tool);
}

export function dateStatusLine(
  eventType: EventType,
  date: string | null,
): string {
  const label = eventType === "event" ? "Event date" : "Wedding date";
  return date ? `${label}: ${date}.` : `${label} is not set yet.`;
}
