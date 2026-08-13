/**
 * Derived-at-read stale-lead predicate for the CRM pipeline.
 * Rule: non-terminal stage AND updated_at older than threshold.
 * Terminal stages (booked, lost) are never stale — a closed lead isn't "going cold."
 */

export const LEAD_STALE_THRESHOLD_DAYS = 14;

const TERMINAL_STAGES = new Set(["booked", "lost"]);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function leadInactiveDays(
  updatedAt: string,
  now: Date = new Date(),
): number {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return 0;
  return Math.floor((now.getTime() - updated.getTime()) / MS_PER_DAY);
}

export function isLeadStale(
  lead: { stage: string; updated_at: string },
  thresholdDays: number = LEAD_STALE_THRESHOLD_DAYS,
  now: Date = new Date(),
): boolean {
  if (TERMINAL_STAGES.has(lead.stage)) return false;
  return leadInactiveDays(lead.updated_at, now) >= thresholdDays;
}
