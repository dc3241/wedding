export type TimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  section: string | null;
  owner: string | null;
  position: number;
};

export type TimelineRunSheetBlock = {
  section: string | null;
  events: TimelineEvent[];
};

function compareTimelineEvents(a: TimelineEvent, b: TimelineEvent) {
  if (a.start_time === null && b.start_time !== null) return 1;
  if (a.start_time !== null && b.start_time === null) return -1;
  if (a.start_time !== null && b.start_time !== null) {
    const byTime = a.start_time.localeCompare(b.start_time);
    if (byTime !== 0) return byTime;
  }
  return a.position - b.position;
}

export function groupTimelineEvents(events: TimelineEvent[]): TimelineRunSheetBlock[] {
  const sorted = [...events].sort(compareTimelineEvents);
  const blocks: TimelineRunSheetBlock[] = [];

  for (const event of sorted) {
    const section = event.section?.trim() || null;
    const last = blocks[blocks.length - 1];

    if (!last || last.section !== section) {
      blocks.push({ section, events: [event] });
    } else {
      last.events.push(event);
    }
  }

  return blocks;
}

export function formatTimeOfDay(time: string | null): string {
  if (!time) return "—";

  const [hourPart, minutePart] = time.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = minutePart?.slice(0, 2) ?? "00";
  if (Number.isNaN(hour)) return "—";

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

export function timeInputValue(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
): string {
  if (!startTime) return "—";
  if (!endTime) return formatTimeOfDay(startTime);
  return `${formatTimeOfDay(startTime)} – ${formatTimeOfDay(endTime)}`;
}
