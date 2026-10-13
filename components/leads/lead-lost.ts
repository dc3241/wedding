export const LOST_REASONS = [
  { value: "budget", label: "Budget" },
  { value: "date_unavailable", label: "Date unavailable" },
  { value: "chose_other", label: "Chose someone else" },
  { value: "no_response", label: "No response" },
  { value: "not_a_fit", label: "Not a fit" },
  { value: "other", label: "Other" },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]["value"];

export const LOST_NOTE_MAX = 240;

export function isLostReason(value: string | null | undefined): value is LostReason {
  return LOST_REASONS.some((reason) => reason.value === value);
}

export function lostReasonLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return LOST_REASONS.find((reason) => reason.value === trimmed)?.label ?? trimmed;
}

export function parseLostNote(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > LOST_NOTE_MAX) {
    return {
      ok: false,
      error: `Keep the note under ${LOST_NOTE_MAX} characters.`,
    };
  }
  return { ok: true, value: trimmed || null };
}
