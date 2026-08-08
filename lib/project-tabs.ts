import type { AccountKind } from "@/lib/account-context";

export type ProjectTab = {
  label: string;
  segment: string;
  plannerOnly?: boolean;
  /** Shown for personal account owners only — not business, not no-account collaborators. */
  coupleOnly?: boolean;
};

/** Couple documentation Contracts tab — distinct from CRM `contracts`. */
export const COUPLE_CONTRACTS_SEGMENT = "agreements";

/**
 * Master tab list. Audience filters in `tabsForAccountKind` produce:
 * - personal: Overview · Calendar · Checklist · Budget · Vendors · Guests · Website ·
 *   Seating · Day-of timeline · Contracts · Notes & files
 * - business: Overview · Checklist · Budget · Vendors · Guests · Website · Seating ·
 *   Day-of timeline · Contracts · Notes & files · Access
 * - null (no account / invited collaborator): personal set minus Calendar
 */
export const PROJECT_TABS: ProjectTab[] = [
  { label: "Overview", segment: "" },
  { label: "Calendar", segment: "calendar", coupleOnly: true },
  { label: "Checklist", segment: "checklist" },
  { label: "Budget", segment: "budget" },
  { label: "Vendors", segment: "vendors" },
  { label: "Guests", segment: "guests" },
  { label: "Website", segment: "website" },
  { label: "Seating", segment: "seating" },
  { label: "Day-of timeline", segment: "timeline" },
  { label: "Contracts", segment: "contracts", plannerOnly: true },
  {
    label: "Contracts",
    segment: COUPLE_CONTRACTS_SEGMENT,
    coupleOnly: true,
  },
  { label: "Notes & files", segment: "notes" },
  { label: "Access", segment: "access", plannerOnly: true },
];

/**
 * Filter workspace tabs by account kind.
 * Pass `null` when the viewer has no account (invited collaborator) — do not
 * collapse null to `"personal"` at the call site.
 */
export function tabsForAccountKind(kind: AccountKind | null): ProjectTab[] {
  return PROJECT_TABS.filter((tab) => {
    if (tab.plannerOnly && kind !== "business") return false;
    if (tab.coupleOnly && kind !== "personal") return false;
    return true;
  });
}

export function projectTabHref(projectId: string, segment: string): string {
  const base = `/projects/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}
