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

/** Absolute target window start for a phase when a wedding date is set. */
export function phaseTargetDate(
  weddingDate: string,
  phase: string,
): string | null {
  const months = phaseMonthsBefore(phase);
  if (months === null) return null;
  const d = new Date(weddingDate + "T00:00:00");
  d.setMonth(d.getMonth() - months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPhaseTargetLabel(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
