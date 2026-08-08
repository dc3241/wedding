/** Locked formality values for wedding_profile.formality (ONB-04 / 0068). */

export const FORMALITY_OPTIONS = [
  "casual",
  "semi-formal",
  "formal",
  "black-tie",
] as const;

export type Formality = (typeof FORMALITY_OPTIONS)[number];

export function isFormality(value: string): value is Formality {
  return (FORMALITY_OPTIONS as readonly string[]).includes(value);
}
