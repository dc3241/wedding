/**
 * MEDIA-01: the free planning tools and guides that make up the public
 * "Plan" hub. One list so the homepage, /plan, nav and footer agree.
 */
export type PlanTool = {
  href: string;
  title: string;
  body: string;
  /** "tool" = works on the page with no login; "guide" = explains an app feature. */
  kind: "tool" | "guide";
};

export const PLAN_TOOLS: readonly PlanTool[] = [
  {
    href: "/plan/venue-quiz",
    title: "Venue match quiz",
    body: "Answer three questions and see real wedding venues in your state that fit your style.",
    kind: "tool",
  },
  {
    href: "/plan/wedding-cost-calculator",
    title: "Wedding cost calculator",
    body: "Estimate your total from your guest count and style, then see how it splits across vendors.",
    kind: "tool",
  },
  {
    href: "/plan/wedding-alcohol-calculator",
    title: "Wedding alcohol calculator",
    body: "How many bottles of wine, beer and liquor to buy for your guests and reception length.",
    kind: "tool",
  },
  {
    href: "/wedding-vendors",
    title: "Vendor directory",
    body: "Venues, photographers, florists and DJs by state. Free to browse, and no one pays to rank.",
    kind: "tool",
  },
  {
    href: "/wedding-planning-checklist",
    title: "Wedding planning checklist",
    body: "What to book and when, working backward from your wedding date.",
    kind: "guide",
  },
  {
    href: "/wedding-budget-tracking",
    title: "Budget tracker",
    body: "Estimate vs. actual for every vendor, plus the deposits still coming due.",
    kind: "guide",
  },
  {
    href: "/wedding-guest-list",
    title: "Guest list & RSVP",
    body: "Households, plus-ones and kids, with online RSVP on your wedding website.",
    kind: "guide",
  },
  {
    href: "/wedding-seating-chart",
    title: "Seating chart",
    body: "Drag guests onto tables and keep the chart in sync with RSVPs.",
    kind: "guide",
  },
];
