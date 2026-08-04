import type { AccountKind } from "@/lib/account-context";

export type ProjectTab = {
  label: string;
  segment: string;
  plannerOnly?: boolean;
  /** Shown for non-business shells only (couple + invited collaborators). */
  coupleOnly?: boolean;
};

export const PROJECT_TABS: ProjectTab[] = [
  { label: "Overview", segment: "" },
  { label: "Checklist", segment: "checklist" },
  { label: "Calendar", segment: "calendar", coupleOnly: true },
  { label: "Day-of timeline", segment: "timeline" },
  { label: "Budget", segment: "budget" },
  { label: "Vendors", segment: "vendors" },
  { label: "Guests", segment: "guests" },
  { label: "Seating", segment: "seating" },
  { label: "Website", segment: "website" },
  { label: "Contracts", segment: "contracts", plannerOnly: true },
  { label: "Access", segment: "access", plannerOnly: true },
  { label: "Notes & files", segment: "notes" },
];

export function tabsForAccountKind(kind: AccountKind): ProjectTab[] {
  const isPlanner = kind === "business";
  return PROJECT_TABS.filter((tab) => {
    if (tab.plannerOnly && !isPlanner) return false;
    if (tab.coupleOnly && isPlanner) return false;
    return true;
  });
}

export function projectTabHref(projectId: string, segment: string): string {
  const base = `/projects/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}
