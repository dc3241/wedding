import { monthsBefore } from "@/lib/date-months";

/** Canonical checklist phase order — single source for checklist + aggregates. */
export const PHASE_ORDER = [
  "12+ months",
  "9 months",
  "6 months",
  "3 months",
  "1 month",
  "week of",
] as const;

export type ChecklistPhase = (typeof PHASE_ORDER)[number];

/** Months-before offset per canonical phase (derived from phase labels). */
export const PHASE_MONTHS_BEFORE: Record<ChecklistPhase, number> = {
  "12+ months": 12,
  "9 months": 9,
  "6 months": 6,
  "3 months": 3,
  "1 month": 1,
  "week of": 0,
};

export function isCanonicalPhase(phase: string): phase is ChecklistPhase {
  return (PHASE_ORDER as readonly string[]).includes(phase);
}

export function phaseMonthsBefore(phase: string): number | null {
  if (!isCanonicalPhase(phase)) return null;
  return PHASE_MONTHS_BEFORE[phase];
}

/**
 * Inverse of PHASE_MONTHS_BEFORE: highest bucket whose offset is <= months.
 * 0 → "week of"; months >= 12 → "12+ months".
 */
export function phaseFromMonthsBefore(months: number): ChecklistPhase {
  const m = Math.max(0, months);
  for (const phase of PHASE_ORDER) {
    if (PHASE_MONTHS_BEFORE[phase] <= m) {
      return phase;
    }
  }
  return "week of";
}

/** Absolute target window start for a phase when a wedding date is set. */
export function phaseTargetDate(
  weddingDate: string,
  phase: string,
): string | null {
  const months = phaseMonthsBefore(phase);
  if (months === null) return null;
  return monthsBefore(weddingDate, months);
}

export function formatPhaseTargetLabel(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
