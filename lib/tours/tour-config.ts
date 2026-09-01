export type TourStepTarget =
  | "stats"
  | "payment"
  | "attention"
  | "assistant"
  | "seating-canvas"
  | "seating-assign"
  | "seating-sweetheart"
  | "guests-list"
  | "guests-add"
  | "guests-rsvp"
  | "guests-meal"
  | "budget-categories"
  | "budget-category-ramp"
  | "budget-paid-due"
  | "website-preview"
  | "website-section-reorder"
  | "website-section-toggle"
  | "website-gallery-shape"
  | "website-timeline-layout"
  | "checklist-phases"
  | "checklist-open-now"
  | "vendors-search"
  | "vendors-outreach"
  | "notes-grid"
  | "notes-action"
  | "notes-files";

export type TourStep = {
  target: TourStepTarget;
  title: string;
  body: string;
};

export type TourConfig = {
  key: string;
  steps: TourStep[];
};

/**
 * Tab segment → tour_key for auto-fire. Segments without an entry are skipped
 * (Calendar, Access, Day-of timeline, Contracts stay out of this slice).
 */
export const TOUR_KEY_BY_SEGMENT: Record<string, string> = {
  "": "overview",
  seating: "seating",
  guests: "guests",
  budget: "budget",
  website: "website",
  checklist: "checklist",
  vendors: "vendors",
  notes: "notes",
};

/**
 * Static page-tour definitions. Keys match `user_tours.tour_key`.
 * Copy lives here only — do not inline step text in overlay/UI.
 */
export const TOUR_CONFIGS: Record<string, TourConfig> = {
  overview: {
    key: "overview",
    steps: [
      {
        target: "stats",
        title: "Your snapshot",
        body: "Countdown, budget, guest confirmations, and task progress at a glance — this updates automatically as you plan.",
      },
      {
        target: "payment",
        title: "Next payment",
        body: "The soonest upcoming vendor payment, so nothing slips past its due date.",
      },
      {
        target: "attention",
        title: "Needs attention",
        body: "Anything overdue or coming up fast floats here first — this is your worklist, not a full task log.",
      },
      {
        target: "assistant",
        title: "Ask the assistant",
        body: "Not sure what to do next? Ask in plain language — it can draft tasks, check your budget, and more.",
      },
    ],
  },
  seating: {
    key: "seating",
    steps: [
      {
        target: "seating-canvas",
        title: "Your floor plan",
        body: "This is the seating canvas — place tables, pan and zoom, then seat guests onto the plan.",
      },
      {
        target: "seating-assign",
        title: "Seat a guest",
        body: "Click an empty seat, then pick someone from this roster — search if the list is long, or select a person first and click a seat. Occupied seats open swap, replace, or unseat.",
      },
      {
        target: "seating-sweetheart",
        title: "Sweetheart tables",
        body: "Mark a table as sweetheart from Kind — it's a label and shape, not a status color.",
      },
    ],
  },
  guests: {
    key: "guests",
    steps: [
      {
        target: "guests-list",
        title: "People, not just households",
        body: "The guest list is a flat person list — everyone appears as their own row, even when they share a household.",
      },
      {
        target: "guests-add",
        title: "Add a guest",
        body: "Add one person at a time as Adult or Child. Optionally link them with Guest of when they're associated with someone already on the list.",
      },
      {
        target: "guests-rsvp",
        title: "RSVP status",
        body: "The colored RSVP control is the source of truth — update it here anytime, including after website responses come in.",
      },
      {
        target: "guests-meal",
        title: "Meal choices",
        body: "When service is plated, each person gets a meal column so you can track selections alongside RSVP.",
      },
    ],
  },
  budget: {
    key: "budget",
    steps: [
      {
        target: "budget-categories",
        title: "Category rollups",
        body: "Each card is a read-only category summary — expand one when you need to edit line items underneath.",
      },
      {
        target: "budget-category-ramp",
        title: "Paid vs actual",
        body: "The bar is paid ÷ actual for the category — not planned vs actual. Color shifts as you catch up on payments.",
      },
      {
        target: "budget-paid-due",
        title: "Paid and next due",
        body: "Total paid and the next upcoming due amount live on the card face so you can scan cash flow without opening every category.",
      },
    ],
  },
  website: {
    key: "website",
    steps: [
      {
        target: "website-preview",
        title: "Live preview",
        body: "Edits show up here as you work — keep an eye on the guest-facing site while you change sections.",
      },
      {
        target: "website-section-reorder",
        title: "Reorder sections",
        body: "Use Up and Down on a section to change the order guests see on the published site.",
      },
      {
        target: "website-section-toggle",
        title: "Expand a section",
        body: "Collapse sections you're not editing and expand one to change its content and options.",
      },
      {
        target: "website-gallery-shape",
        title: "Photo shape",
        body: "In Gallery, pick how photos are cropped — rectangle, circle, arch, and more.",
      },
      {
        target: "website-timeline-layout",
        title: "Timeline layout",
        body: "In Schedule, choose how the day timeline is laid out on the site — centered, alternating, or left rail.",
      },
    ],
  },
  checklist: {
    key: "checklist",
    steps: [
      {
        target: "checklist-phases",
        title: "Tasks by phase",
        body: "Work is grouped into planning phases — open a phase to check off tasks and add new ones.",
      },
      {
        target: "checklist-open-now",
        title: "Open right now",
        body: "This rail surfaces the open tasks that need attention soonest — your short list beside the full phase board.",
      },
    ],
  },
  vendors: {
    key: "vendors",
    steps: [
      {
        target: "vendors-search",
        title: "Find vendors",
        body: "Search by category and location — results show photo-led cards with ratings and details from Google Maps. Add a result to this wedding's shortlist to track outreach without leaving the project.",
      },
      {
        target: "vendors-outreach",
        title: "Outreach pipeline",
        body: "Open Outreach to manage your shortlist — draft emails, track replies, and move vendors through to booked.",
      },
    ],
  },
  notes: {
    key: "notes",
    steps: [
      {
        target: "notes-grid",
        title: "Note cards",
        body: "Notes appear as preview cards — open one to edit the full body and action state.",
      },
      {
        target: "notes-action",
        title: "Needs action",
        body: "A rosewood pin marks notes that still need follow-up; open the card to mark done or clear the flag.",
      },
      {
        target: "notes-files",
        title: "Files",
        body: "The same tab holds misc. files — upload PDFs, images, and docs alongside your notes.",
      },
    ],
  },
};

export function getTourConfig(tourKey: string): TourConfig | null {
  return TOUR_CONFIGS[tourKey] ?? null;
}

export function tourKeyForSegment(segment: string): string | null {
  return TOUR_KEY_BY_SEGMENT[segment] ?? null;
}
