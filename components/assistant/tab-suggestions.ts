import {
  assistantPrefill,
  type AssistantPrefillKey,
} from "@/components/assistant/prefills";
import type { EventType } from "@/lib/event-type";

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

export function getTabSuggestion(
  segment: string,
  eventType: EventType = "wedding",
): TabSuggestion | null {
  if (SUPPRESSED_SEGMENTS.has(segment)) return null;

  const prefill = (key: AssistantPrefillKey) =>
    assistantPrefill(key, eventType);
  const event = eventType === "event";

  switch (segment) {
    case "":
      return {
        tooltip: "Ask me what to tackle next",
        prefill: prefill("overview"),
      };
    case "checklist":
      return {
        tooltip: "Ask me to build your checklist",
        prefill: prefill("checklist"),
      };
    case "timeline":
      return {
        tooltip: "Ask me to build your day-of timeline",
        prefill: prefill("timeline"),
      };
    case "budget":
      return {
        tooltip: "Ask me to estimate your budget",
        prefill: prefill("budget"),
      };
    case "vendors":
      return {
        tooltip: "Ask me to find vendors",
        prefill: prefill("vendors"),
      };
    case "guests":
      return {
        tooltip: "Ask me to help organize your guest list",
        prefill: prefill("guests"),
      };
    case "website":
      return {
        tooltip: event
          ? "Ask me for ideas on your event site copy"
          : "Ask me for ideas on your wedding site copy",
        prefill: prefill("website"),
      };
    case "notes":
      return {
        tooltip: "Ask me to jot down a note",
        prefill: prefill("notes"),
      };
    default:
      return null;
  }
}
