export const EVENT_KINDS = [
  "meeting",
  "call",
  "site_visit",
  "tasting",
  "fitting",
  "deadline",
  "other",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  meeting: "Meeting",
  call: "Call",
  site_visit: "Site visit",
  tasting: "Tasting",
  fitting: "Fitting",
  deadline: "Deadline",
  other: "Other",
};

export function isEventKind(value: string): value is EventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

export type CalendarEventRow = {
  id: string;
  account_id: string;
  project_id: string | null;
  title: string;
  event_kind: EventKind;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
};

export type ActiveWedding = {
  id: string;
  name: string;
  wedding_date: string | null;
};

/** Extensible source model — CAL-01a will add a task-due source. */
export type CalendarItemSource = "authored" | "wedding" | (string & {});

export type CalendarItem = {
  id: string;
  source: CalendarItemSource;
  title: string;
  /** Local calendar date YYYY-MM-DD used for grid / rail placement. */
  localDate: string;
  /** Display time label; null for all-day / date-only sources. */
  timeLabel: string | null;
  allDay: boolean;
  sortKey: string;
  projectId: string | null;
  projectName: string | null;
  kind: EventKind | null;
  /** Present when source === "authored". */
  authored?: CalendarEventRow;
};
