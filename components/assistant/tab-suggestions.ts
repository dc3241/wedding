import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";

export type TabSuggestion = {
  tooltip: string;
  prefill: string;
};

const SUPPRESSED_SEGMENTS = new Set(["seating", "contracts"]);

export function pathnameToTabSegment(
  pathname: string,
  projectId: string,
): string {
  const base = `/projects/${projectId}`;
  if (pathname === base) return "";
  if (!pathname.startsWith(`${base}/`)) return "";
  return pathname.slice(base.length + 1).split("/")[0] ?? "";
}

export function getTabSuggestion(segment: string): TabSuggestion | null {
  if (SUPPRESSED_SEGMENTS.has(segment)) return null;

  switch (segment) {
    case "":
      return {
        tooltip: "Ask me what to tackle next",
        prefill: ASSISTANT_PREFILLS.overview,
      };
    case "checklist":
      return {
        tooltip: "Ask me to build your checklist",
        prefill: ASSISTANT_PREFILLS.checklist,
      };
    case "timeline":
      return {
        tooltip: "Ask me to build your day-of timeline",
        prefill: ASSISTANT_PREFILLS.timeline,
      };
    case "budget":
      return {
        tooltip: "Ask me to estimate your budget",
        prefill: ASSISTANT_PREFILLS.budget,
      };
    case "vendors":
      return {
        tooltip: "Ask me to find vendors",
        prefill: ASSISTANT_PREFILLS.vendors,
      };
    case "guests":
      return {
        tooltip: "Ask me to help organize your guest list",
        prefill: ASSISTANT_PREFILLS.guests,
      };
    case "website":
      return {
        tooltip: "Ask me for ideas on your wedding site copy",
        prefill: ASSISTANT_PREFILLS.website,
      };
    case "notes":
      return {
        tooltip: "Ask me to jot down a note",
        prefill: ASSISTANT_PREFILLS.notes,
      };
    default:
      return null;
  }
}
