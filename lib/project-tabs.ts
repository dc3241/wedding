import type { AccountKind } from "@/lib/account-context";

export type ProjectTab = {
  label: string;
  segment: string;
  plannerOnly?: boolean;
};

export const PROJECT_TABS: ProjectTab[] = [
  { label: "Overview", segment: "" },
  { label: "Checklist", segment: "checklist" },
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
  return PROJECT_TABS.filter((tab) => isPlanner || !tab.plannerOnly);
}

export function projectTabHref(projectId: string, segment: string): string {
  const base = `/projects/${projectId}`;
  return segment ? `${base}/${segment}` : base;
}
