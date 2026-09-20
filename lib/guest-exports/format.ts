import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import {
  labelForPartnerSide,
  type ResolvedPartnerSides,
} from "@/lib/partner-sides";

export function envelopeName(
  household: string | null | undefined,
  fullName: string | null | undefined,
): string {
  const label = household?.trim();
  if (label) return label;
  const identity = fullName?.trim();
  return identity || "Unnamed household";
}

export function joinPeopleNames(names: Array<string | null | undefined>): string {
  const clean = names
    .map((name) => name?.trim() ?? "")
    .filter((name) => name.length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  const last = clean[clean.length - 1];
  return `${clean.slice(0, -1).join(", ")}, and ${last}`;
}

export function rsvpLabel(status: RsvpStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function exportFilenameSlug(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "wedding";
}

export function formatRelationship(
  member: {
    relationship: string | null;
    relationship_side: string | null;
  },
  partnerSides: ResolvedPartnerSides,
): string {
  const relationshipLabel = member.relationship?.trim() || null;
  const partnerLabel = labelForPartnerSide(
    partnerSides,
    member.relationship_side,
  );
  if (relationshipLabel && partnerLabel) {
    return `${relationshipLabel} of ${partnerLabel}`;
  }
  return relationshipLabel ?? "";
}
