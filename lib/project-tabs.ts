import type { AccountKind } from "@/lib/account-context";

export type ProjectTab = {
  label: string;
  segment: string;
  plannerOnly?: boolean;
  /** Personal-only by default. Calendar has a CAL-04 / CAL-06 role exception. */
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
 * - null + role couple (invited couple): personal set minus couple Contracts
 *   (Calendar included via CAL-04)
 * - null + role collaborator: personal set minus couple Contracts
 *   (Calendar included via CAL-06)
 * - null (other kind-null roles): personal set minus Calendar and minus
 *   couple Contracts
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
 * Pass `null` when the viewer has no account (invited member) — do not
 * collapse null to `"personal"` at the call site.
 *
 * CAL-04 / CAL-06: when `kind` is null and `projectMemberRole` is `"couple"`
 * or `"collaborator"`, Calendar is shown (still coupleOnly for everyone else).
 * Other coupleOnly tabs stay personal-only. `plannerOnly` remains
 * account-kind only — never role.
 */
export function tabsForAccountKind(
  kind: AccountKind | null,
  projectMemberRole?: string | null,
): ProjectTab[] {
  return PROJECT_TABS.filter((tab) => {
    if (tab.plannerOnly && kind !== "business") return false;
    if (tab.coupleOnly) {
      if (kind === "personal") return true;
      // Calendar-only role exception for invited couples (CAL-04) and
      // invited collaborators (CAL-06). Do not extend to other coupleOnly tabs.
      if (
        kind === null &&
        (projectMemberRole === "couple" ||
          projectMemberRole === "collaborator") &&
        tab.segment === "calendar"
      ) {
        return true;
      }
      return false;
    }
    return true;
  });
}

export function projectTabHref(projectId: string, segment: string): string {
  const base = `/projects/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}
