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

/** Read-only installment overlay (VND-11) — never stored as calendar_events. */
export type PaymentDueOverlay = {
  installmentId: string;
  projectId: string;
  projectName: string;
  budgetItemId: string;
  label: string;
  amount: number;
  due_on: string;
  pastDue: boolean;
};

/** Read-only incomplete-task overlay (VND-11 / CAL-01a). */
export type TaskDueOverlay = {
  taskId: string;
  projectId: string;
  projectName: string;
  title: string;
  due_date: string;
  pastDue: boolean;
};

export type CalendarItemSource =
  | "authored"
  | "wedding"
  | "payment"
  | "task";

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
  /** Uncovered installment past-due (payment source only). */
  pastDue?: boolean;
  /** Display amount for payment markers. */
  amount?: number | null;
  /** Deep-link for read-only overlays (payment → budget, task → checklist). */
  href?: string | null;
};
