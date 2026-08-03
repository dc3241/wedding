/** Curated guest relationship picklist — writer-guarded; no DB CHECK. */

export const GUEST_RELATIONSHIPS = [
  "Family",
  "Friend",
  "Wedding Party",
  "Family Friend",
  "Coworker",
] as const;

export type GuestRelationship = (typeof GUEST_RELATIONSHIPS)[number];

export function isGuestRelationship(
  value: string,
): value is GuestRelationship {
  return (GUEST_RELATIONSHIPS as readonly string[]).includes(value);
}
