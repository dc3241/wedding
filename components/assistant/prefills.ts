import type { EventType } from "@/lib/event-type";

export const ASSISTANT_PREFILLS = {
  overview:
    "Look at my wedding project and tell me what I should tackle next based on what's already set up and what's missing.",
  checklist:
    "Build me a starter wedding checklist organized by planning phase, based on my wedding date. Include the most important tasks I should not miss.",
  timeline:
    "Help me build a day-of wedding timeline run sheet with key events, start times, and who owns each moment.",
  budget:
    "Help me estimate a realistic wedding budget breakdown by category based on my guest count and priorities.",
  vendors:
    "What vendor categories should I prioritize for my wedding, and what should I look for when shortlisting each one?",
  guests:
    "Help me organize my guest list — suggest how to group households, track RSVPs, and what details I should capture for each guest.",
  website:
    "Give me ideas for wedding website copy — welcome message, our story, and practical info for guests. Keep a warm but modern tone.",
  notes:
    "Help me draft a planning note I can save — ask what it's about and suggest a clear title and body with the key details.",
} as const;

const EVENT_PREFILLS: { [K in keyof typeof ASSISTANT_PREFILLS]: string } = {
  overview:
    "Look at this event and tell me what I should tackle next based on what's already set up and what's missing.",
  checklist:
    "Build me a starter checklist for this event, based on the event date. Include the most important tasks I should not miss.",
  timeline:
    "Help me build a day-of timeline with key moments, start times, and who owns each one.",
  budget:
    "Help me estimate a realistic budget breakdown by category based on my guest count and priorities.",
  vendors:
    "What vendor categories should I prioritize for this event, and what should I look for when shortlisting each one?",
  guests: ASSISTANT_PREFILLS.guests,
  website:
    "Give me ideas for event website copy — a welcome message and practical info for guests. Keep a warm but modern tone.",
  notes: ASSISTANT_PREFILLS.notes,
};

export type AssistantPrefillKey = keyof typeof ASSISTANT_PREFILLS;

export function assistantPrefill(
  key: AssistantPrefillKey,
  eventType: EventType = "wedding",
): string {
  if (eventType === "event") return EVENT_PREFILLS[key];
  return ASSISTANT_PREFILLS[key];
}

export function contractReviewPrefill(
  fileName: string,
  eventType: EventType = "wedding",
): string {
  const name = fileName.replace(/["\n\r]/g, "").trim() || "this contract";
  const noun = eventType === "event" ? "event" : "wedding";
  return `Review the uploaded contract "${name}" and tell me what I should double-check — dates, price, hours, guest count, and anything that doesn't match the rest of this ${noun}.`;
}
