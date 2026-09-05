export type ContentPillar = {
  name: string;
  bullets: string[];
  /** Full-width card (Real-wedding walkthroughs). */
  span?: boolean;
  /** Open decision #4 — unapproved angle, visual flag only. */
  isNew?: boolean;
};

export const COUPLES_CONTENT_PILLARS: ContentPillar[] = [
  {
    name: "Budgeting",
    bullets: [
      "Hidden costs (cake-cutting fee, vendor meals, gratuities)",
      "Negotiating with vendors",
      "Tracking actual vs. estimate",
    ],
  },
  {
    name: "Timeline",
    bullets: [
      "What to book when",
      "Common last-minute scrambles",
      "Least-flexible-vendor-first rule",
    ],
  },
  {
    name: "Guests",
    bullets: [
      "RSVP chasing scripts",
      "Seating conflicts",
      "Plus-one etiquette",
    ],
  },
  {
    name: "Vendors",
    bullets: [
      "Contract red flags",
      "Communication cadence",
      "Confirming details pre-wedding",
    ],
  },
  {
    name: "Real-wedding walkthroughs",
    bullets: [
      "Budget breakdown, category by category",
      "Seating chart build",
      "Day-of timeline",
    ],
    span: true,
  },
];

export const PLANNER_CONTENT_PILLARS: ContentPillar[] = [
  {
    name: "Inquiry response time",
    bullets: [
      "Response-time vs. booking-rate benchmark",
      "What to fix first if you're over 4 hours",
    ],
  },
  {
    name: "Lead follow-up cadence",
    bullets: [
      "Same-day acknowledgment",
      "48-hour follow-up",
      "2-week check-in",
    ],
  },
  {
    name: "Avoiding double-bookings",
    bullets: [
      "Shared vendor timelines",
      "Catching conflicts before the client does",
    ],
  },
  {
    name: "Venue-partner angle",
    bullets: [
      '"Give your couples a better planning experience"',
      "Venues inviting their own couples into the app",
    ],
    isNew: true,
  },
];
