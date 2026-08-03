import type {
  ActiveWedding,
  CalendarEventRow,
  CalendarItem,
  EventKind,
  PaymentDueOverlay,
  TaskDueOverlay,
} from "./types";
import { EVENT_KIND_LABELS } from "./types";

/** Local YYYY-MM-DD from a Date in the planner's timezone. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local calendar date (no TZ shift). */
export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * All-day placement date: ignore time entirely — use the stored date
 * portion so the event never drifts off-by-one across timezones.
 * Timed events: local calendar date of the timestamptz.
 */
export function eventLocalDate(event: {
  starts_at: string;
  all_day: boolean;
}): string {
  if (event.all_day) {
    return event.starts_at.slice(0, 10);
  }
  return toLocalDateKey(new Date(event.starts_at));
}

export function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMonthHeading(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatRailDay(localDate: string): string {
  return parseLocalDateKey(localDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatKindLabel(kind: EventKind): string {
  return EVENT_KIND_LABELS[kind];
}

/**
 * Build the 6-week (42-cell) month grid starting on Sunday.
 * month is 1-indexed.
 */
export function buildMonthGrid(
  year: number,
  month: number,
): { localDate: string; inMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month - 1, 1 - startOffset);
  const cells: { localDate: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push({
      localDate: toLocalDateKey(day),
      inMonth: day.getMonth() === month - 1,
    });
  }
  return cells;
}

/** Inclusive window covering the 6-week grid for query bounds. */
export function monthGridWindow(
  year: number,
  month: number,
): { rangeStart: string; rangeEnd: string } {
  const cells = buildMonthGrid(year, month);
  const first = cells[0]!.localDate;
  const last = cells[41]!.localDate;
  // Pad ends so timed events near day boundaries are included.
  return {
    rangeStart: `${first}T00:00:00.000Z`,
    rangeEnd: `${last}T23:59:59.999Z`,
  };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

export function parseYearMonth(
  value: string | undefined,
  fallback: Date,
): { year: number; month: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth() + 1,
  };
}

/**
 * Persist all-day as noon UTC on the chosen calendar date so the ISO
 * date prefix is the intended day in every timezone (no off-by-one).
 */
export function allDayStartsAt(localDate: string): string {
  return `${localDate}T12:00:00.000Z`;
}

/** Build local timestamptz ISO from date + HH:MM in the planner's TZ. */
export function timedStartsAt(localDate: string, timeHm: string): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm] = timeHm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

export function localTimeHm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function authoredToItem(
  event: CalendarEventRow,
  projectNameById: Map<string, string>,
): CalendarItem {
  const localDate = eventLocalDate(event);
  const timeLabel = event.all_day ? null : formatTimeLabel(event.starts_at);
  return {
    id: `authored:${event.id}`,
    source: "authored",
    title: event.title,
    localDate,
    timeLabel,
    allDay: event.all_day,
    sortKey: event.all_day
      ? `${localDate}T00:00:00`
      : event.starts_at,
    projectId: event.project_id,
    projectName: event.project_id
      ? (projectNameById.get(event.project_id) ?? null)
      : null,
    kind: event.event_kind,
    authored: event,
  };
}

export function weddingToItem(project: ActiveWedding): CalendarItem | null {
  if (!project.wedding_date) return null;
  const localDate = project.wedding_date; // date column — already YYYY-MM-DD
  return {
    id: `wedding:${project.id}`,
    source: "wedding",
    title: project.name,
    localDate,
    timeLabel: null,
    allDay: true,
    sortKey: `${localDate}T00:00:00`,
    projectId: project.id,
    projectName: project.name,
    kind: null,
  };
}

export function paymentToItem(row: PaymentDueOverlay): CalendarItem {
  const localDate = row.due_on;
  return {
    id: `payment:${row.installmentId}`,
    source: "payment",
    title: row.label,
    localDate,
    timeLabel: null,
    allDay: true,
    sortKey: `${localDate}T00:00:01`,
    projectId: row.projectId,
    projectName: row.projectName,
    kind: null,
    pastDue: row.pastDue,
    amount: row.amount,
    href: `/projects/${row.projectId}/budget#budget-item-${row.budgetItemId}`,
  };
}

export function taskToItem(row: TaskDueOverlay): CalendarItem {
  const localDate = row.due_date;
  return {
    id: `task:${row.taskId}`,
    source: "task",
    title: row.title,
    localDate,
    timeLabel: null,
    allDay: true,
    sortKey: `${localDate}T00:00:02`,
    projectId: row.projectId,
    projectName: row.projectName,
    kind: null,
    pastDue: row.pastDue,
    href: `/projects/${row.projectId}/checklist#task-${row.taskId}`,
  };
}

export function buildCalendarItems(
  events: CalendarEventRow[],
  weddings: ActiveWedding[],
  payments: PaymentDueOverlay[] = [],
  tasks: TaskDueOverlay[] = [],
): CalendarItem[] {
  const projectNameById = new Map(weddings.map((w) => [w.id, w.name]));
  const items: CalendarItem[] = [
    ...events.map((e) => authoredToItem(e, projectNameById)),
  ];
  for (const wedding of weddings) {
    const item = weddingToItem(wedding);
    if (item) items.push(item);
  }
  for (const payment of payments) {
    items.push(paymentToItem(payment));
  }
  for (const task of tasks) {
    items.push(taskToItem(task));
  }
  items.sort((a, b) => {
    if (a.sortKey < b.sortKey) return -1;
    if (a.sortKey > b.sortKey) return 1;
    return a.title.localeCompare(b.title);
  });
  return items;
}

export function itemsOnDate(
  items: CalendarItem[],
  localDate: string,
): CalendarItem[] {
  return items.filter((item) => item.localDate === localDate);
}

export function upcomingItems(
  items: CalendarItem[],
  todayKey: string,
  days = 7,
): CalendarItem[] {
  const end = parseLocalDateKey(todayKey);
  end.setDate(end.getDate() + (days - 1));
  const endKey = toLocalDateKey(end);
  return items.filter(
    (item) => item.localDate >= todayKey && item.localDate <= endKey,
  );
}
