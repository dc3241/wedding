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

export type TimelineOverlap = {
  otherId: string;
  otherTitle: string;
  sameOwner: boolean;
};

export type TimelineAnnotatedEvent = TimelineEvent & {
  durationMinutes: number | null;
  gapAfterMinutes: number | null;
  overlaps: TimelineOverlap[];
};

export type TimelineSectionGroup = {
  key: string;
  label: string;
  /** null start_time bucket */
  unscheduled: boolean;
  events: TimelineAnnotatedEvent[];
  total: number;
};

export type TimelineAggregates = {
  total: number;
  earliestStart: string | null;
  latestStart: string | null;
  daySpanLabel: string | null;
  scheduledDurationMinutes: number;
  scheduledDurationLabel: string;
  conflictCount: number;
  gapCount: number;
  sameOwnerConflictCount: number;
  owners: string[];
  sections: TimelineSectionGroup[];
};

/**
 * Times before this cutoff (04:00) belong to the post-midnight "wedding day"
 * continuation and sort after evening events.
 */
export const TIMELINE_DAY_CUTOFF_MINUTES = 4 * 60;

/** Parse Postgres `time` / HTML time value to minutes since midnight. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const trimmed = time.trim();
  if (!trimmed) return null;
  const [hPart, mPart] = trimmed.split(":");
  const h = Number.parseInt(hPart, 10);
  const m = Number.parseInt((mPart ?? "0").slice(0, 2), 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Minutes for wedding-day order (post-midnight early hours sort last).
 * Shared by the timeline page and the printable run sheet.
 */
export function timelineSortMinutes(
  time: string | null | undefined,
): number | null {
  const mins = timeToMinutes(time);
  if (mins == null) return null;
  return mins < TIMELINE_DAY_CUTOFF_MINUTES ? mins + 24 * 60 : mins;
}

/**
 * [start, end] on the wedding-day timeline. When end is clock-before or equal
 * to start after cutoff adjustment, treat end as the next calendar morning.
 */
export function eventIntervalSortMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): { start: number; end: number } | null {
  const startM = timelineSortMinutes(start);
  if (startM == null) return null;
  const endRaw = timeToMinutes(end);
  if (endRaw == null) return null;

  let endM = timelineSortMinutes(end);
  if (endM == null) return null;
  if (endM <= startM) {
    endM = endRaw + 24 * 60;
  }
  return { start: startM, end: endM };
}

export function formatDurationMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Shared display clock — page + run sheet. */
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

/** Shared range — includes end when present (midnight-crossing ranges render sanely). */
export function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
): string {
  if (!startTime) return "—";
  if (!endTime) return formatTimeOfDay(startTime);
  return `${formatTimeOfDay(startTime)} – ${formatTimeOfDay(endTime)}`;
}

/** Shared event order — start (midnight-aware) then position. Null starts last. */
export function compareTimelineEvents(a: TimelineEvent, b: TimelineEvent) {
  const aSort = timelineSortMinutes(a.start_time);
  const bSort = timelineSortMinutes(b.start_time);

  if (aSort == null && bSort != null) return 1;
  if (aSort != null && bSort == null) return -1;
  if (aSort != null && bSort != null && aSort !== bSort) {
    return aSort - bSort;
  }
  return a.position - b.position;
}

function sectionKey(section: string | null): string {
  const trimmed = section?.trim() || null;
  return trimmed === null ? "__other__" : trimmed;
}

function sectionLabel(section: string | null): string {
  const trimmed = section?.trim() || null;
  return trimmed ?? "Other";
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  // Touching endpoints (A ends when B starts) is not an overlap.
  return aStart < bEnd && bStart < aEnd;
}

export function computeTimelineAggregates(
  events: TimelineEvent[],
): TimelineAggregates {
  const sorted = [...events].sort(compareTimelineEvents);

  let earliestStart: string | null = null;
  let latestStart: string | null = null;
  let earliestSort: number | null = null;
  let latestSort: number | null = null;
  let scheduledDurationMinutes = 0;

  const annotated: TimelineAnnotatedEvent[] = sorted.map((event) => {
    const interval = eventIntervalSortMinutes(event.start_time, event.end_time);
    let durationMinutes: number | null = null;

    if (interval != null && interval.end > interval.start) {
      durationMinutes = interval.end - interval.start;
      scheduledDurationMinutes += durationMinutes;
    }

    const startSort = timelineSortMinutes(event.start_time);
    if (event.start_time && startSort != null) {
      if (earliestSort == null || startSort < earliestSort) {
        earliestSort = startSort;
        earliestStart = event.start_time;
      }
      if (latestSort == null || startSort > latestSort) {
        latestSort = startSort;
        latestStart = event.start_time;
      }
    }

    return {
      ...event,
      durationMinutes,
      gapAfterMinutes: null,
      overlaps: [],
    };
  });

  // Gaps + overlaps only among fully timed edges; never infer across missing times.
  const scheduled = annotated.filter((e) => e.start_time != null);
  for (let i = 0; i < scheduled.length - 1; i++) {
    const curr = scheduled[i];
    const next = scheduled[i + 1];
    const currInterval = eventIntervalSortMinutes(
      curr.start_time,
      curr.end_time,
    );
    const nextStart = timelineSortMinutes(next.start_time);
    if (
      currInterval != null &&
      nextStart != null &&
      nextStart > currInterval.end
    ) {
      curr.gapAfterMinutes = nextStart - currInterval.end;
    }
  }

  for (let i = 0; i < scheduled.length; i++) {
    const a = scheduled[i];
    const aInterval = eventIntervalSortMinutes(a.start_time, a.end_time);
    if (aInterval == null || aInterval.end <= aInterval.start) continue;

    for (let j = i + 1; j < scheduled.length; j++) {
      const b = scheduled[j];
      const bInterval = eventIntervalSortMinutes(b.start_time, b.end_time);
      if (bInterval == null || bInterval.end <= bInterval.start) continue;
      // Later starts past A's end cannot overlap (sorted by wedding-day start).
      if (bInterval.start >= aInterval.end) break;
      if (
        !intervalsOverlap(
          aInterval.start,
          aInterval.end,
          bInterval.start,
          bInterval.end,
        )
      ) {
        continue;
      }

      const ownerA = a.owner?.trim() || null;
      const ownerB = b.owner?.trim() || null;
      const sameOwner =
        ownerA != null && ownerB != null && ownerA === ownerB;

      a.overlaps.push({
        otherId: b.id,
        otherTitle: b.title,
        sameOwner,
      });
      b.overlaps.push({
        otherId: a.id,
        otherTitle: a.title,
        sameOwner,
      });
    }
  }

  const overlapPairs = new Set<string>();
  let sameOwnerConflictCount = 0;
  for (const event of annotated) {
    for (const overlap of event.overlaps) {
      const pairKey = [event.id, overlap.otherId].sort().join(":");
      if (overlapPairs.has(pairKey)) continue;
      overlapPairs.add(pairKey);
      if (overlap.sameOwner) sameOwnerConflictCount += 1;
    }
  }

  const gapCount = annotated.filter((e) => e.gapAfterMinutes != null).length;

  // Owners: distinct non-null, first-seen in sorted order.
  const owners: string[] = [];
  const seenOwners = new Set<string>();
  for (const event of annotated) {
    const owner = event.owner?.trim();
    if (!owner || seenOwners.has(owner)) continue;
    seenOwners.add(owner);
    owners.push(owner);
  }

  // Section groups in first-seen order among scheduled events.
  const sections: TimelineSectionGroup[] = [];
  const sectionIndex = new Map<string, number>();

  for (const event of annotated) {
    if (event.start_time == null) continue;
    const key = sectionKey(event.section);
    const existing = sectionIndex.get(key);
    if (existing === undefined) {
      sectionIndex.set(key, sections.length);
      sections.push({
        key,
        label: sectionLabel(event.section),
        unscheduled: false,
        events: [event],
        total: 1,
      });
    } else {
      sections[existing].events.push(event);
      sections[existing].total += 1;
    }
  }

  const unscheduledEvents = annotated.filter((e) => e.start_time == null);
  if (unscheduledEvents.length > 0) {
    sections.push({
      key: "__unscheduled__",
      label: "Unscheduled",
      unscheduled: true,
      events: unscheduledEvents,
      total: unscheduledEvents.length,
    });
  }

  const daySpanLabel =
    earliestStart && latestStart
      ? earliestStart === latestStart
        ? formatTimeOfDay(earliestStart)
        : `${formatTimeOfDay(earliestStart)} – ${formatTimeOfDay(latestStart)}`
      : null;

  return {
    total: annotated.length,
    earliestStart,
    latestStart,
    daySpanLabel,
    scheduledDurationMinutes,
    scheduledDurationLabel:
      scheduledDurationMinutes > 0
        ? formatDurationMinutes(scheduledDurationMinutes)
        : "—",
    conflictCount: overlapPairs.size,
    gapCount,
    sameOwnerConflictCount,
    owners,
    sections,
  };
}

/** Filter events for a run sheet owner param (`null` / all = master sheet). */
export function filterEventsByOwner(
  events: TimelineEvent[],
  owner: string | null,
): TimelineEvent[] {
  if (!owner) return events;
  return events.filter((e) => (e.owner?.trim() || null) === owner);
}
