import type { SlideLayout } from "@/lib/admin/content-queue/slide-spec";

/**
 * Authored UI for each product-shot slug. Labels and figures come from
 * design/product-shots and the hero copy in product-shots.ts.
 *
 * List surfaces use headline-card. Budget, overview, and the other
 * "one motif" surfaces use headline-phone.
 *
 * The wedding website is the exception: a redrawn phone cannot carry the
 * guest-site templates, so that surface fills the bezel with a baked
 * screenshot from stills/public/website.
 */

/** "look" (template and palette names on a white editor) is retired from the rotation. */
export const WEBSITE_SHOTS = ["where-when", "timeline"] as const;
export type WebsiteShot = (typeof WEBSITE_SHOTS)[number];

export function isWebsiteShot(value: unknown): value is WebsiteShot {
  return (WEBSITE_SHOTS as readonly string[]).includes(String(value));
}

/** Prefer a shot that has not appeared in the recent queue. */
export function pickWebsiteShot(recent: readonly string[], avoid: readonly string[] = []): WebsiteShot {
  const blocked = new Set([...avoid, ...recent]);
  const fresh = WEBSITE_SHOTS.find((shot) => !blocked.has(shot));
  if (fresh) return fresh;
  const rotated = WEBSITE_SHOTS.find((shot) => !avoid.includes(shot));
  return rotated ?? "where-when";
}

type CardData = {
  tabs?: string[];
  rows: { label: string; status: string; tone: "good" | "warn" | "bad" | "neutral" }[];
};

type PhoneData = {
  shot?: WebsiteShot;
  hero: { label: string; value: string; chip?: string; sub?: string };
  listTitle?: string;
  items?: { label: string; note?: string; tone?: "good" | "warn" | "bad" | "neutral" }[];
  progress?: { label: string; value: string; pct: number };
  bulletsTitle?: string;
  bullets?: string[];
};

const WEBSITE_COPY: Record<WebsiteShot, { bulletsTitle: string; bullets: string[] }> = {
  "where-when": {
    bulletsTitle: "On the page",
    bullets: ["Ceremony", "Reception", "The address"],
  },
  timeline: {
    bulletsTitle: "The day",
    bullets: ["Getting ready", "Ceremony", "Dinner and toasts"],
  },
};

function websiteSurface(shot: WebsiteShot): PhoneData {
  const copy = WEBSITE_COPY[shot];
  return {
    shot,
    hero: { label: "Wedding site", value: "Garden", chip: "Sage", sub: "Template and palette" },
    bulletsTitle: copy.bulletsTitle,
    bullets: copy.bullets,
  };
}

const CARD: Record<string, CardData> = {
  guests: {
    tabs: ["Guests", "Meals"],
    rows: [
      { label: "Attending", status: "93", tone: "good" },
      { label: "Pending", status: "43", tone: "warn" },
      { label: "Declined", status: "4", tone: "bad" },
      { label: "People", status: "140", tone: "neutral" },
    ],
  },
  leads: {
    rows: [
      { label: "Ava & Dominic", status: "Inquiry", tone: "neutral" },
      { label: "Harper & Quinn", status: "Proposal", tone: "warn" },
    ],
  },
  vendors: {
    tabs: ["Outreach", "Booked"],
    rows: [
      { label: "Florist", status: "Still to book", tone: "warn" },
      { label: "Velvet Strings", status: "To contact", tone: "neutral" },
    ],
  },
  "vendor-library": {
    rows: [
      { label: "Preferred florist", status: "In the book", tone: "good" },
      { label: "Preferred band", status: "In the book", tone: "good" },
      { label: "Preferred photo", status: "In the book", tone: "neutral" },
    ],
  },
  dashboard: {
    rows: [
      { label: "Sophie & James", status: "Aug 29, 2026", tone: "neutral" },
      { label: "Elena & Marcus", status: "Feb 14, 2027", tone: "good" },
      { label: "Mila & Griffin", status: "May 15, 2027", tone: "neutral" },
    ],
  },
  invoices: {
    rows: [
      { label: "Retainer", status: "Paid", tone: "good" },
      { label: "Planning fee", status: "Sent", tone: "warn" },
    ],
  },
  checklist: {
    rows: [
      { label: "Book the venue", status: "Done", tone: "good" },
      { label: "Order invitations", status: "In progress", tone: "warn" },
      { label: "Confirm the menu", status: "Not started", tone: "neutral" },
    ],
  },
  timeline: {
    rows: [
      { label: "Ceremony", status: "4:00 pm", tone: "neutral" },
      { label: "Cocktail hour", status: "4:30 pm", tone: "neutral" },
      { label: "Reception", status: "6:00 pm", tone: "good" },
    ],
  },
  automations: {
    rows: [
      { label: "New inquiry", status: "Ready", tone: "good" },
      { label: "Proposal follow-up", status: "Ready", tone: "neutral" },
      { label: "Invoice follow-up", status: "Ready", tone: "warn" },
    ],
  },
  calendar: {
    rows: [
      { label: "Venue walk-through", status: "Thu", tone: "neutral" },
      { label: "Menu tasting", status: "Sat", tone: "good" },
      { label: "Florist meeting", status: "Next week", tone: "warn" },
    ],
  },
};

const PHONE: Record<string, PhoneData> = {
  budget: {
    hero: {
      label: "Paid",
      value: "$6,700",
      chip: "$25,900 left",
      sub: "on the $32,600 plan",
    },
    listTitle: "The wells",
    items: [
      { label: "Budgeted", note: "$32,600", tone: "neutral" },
      { label: "Unallocated", note: "$12,400", tone: "warn" },
      { label: "Actual", note: "$17,700", tone: "neutral" },
      { label: "Left to pay", note: "$25,900", tone: "good" },
    ],
    progress: {
      label: "Paid",
      value: "$6,700 paid · $25,900 left on the $32,600 plan",
      pct: 21,
    },
    bulletsTitle: "On this wedding",
    bullets: [
      "Budgeted $32,600",
      "Unallocated $12,400",
      "Actual $17,700",
      "Paid so far $6,700",
      "Left to pay $25,900",
    ],
  },
  "budget-categories": {
    hero: { label: "Venue", value: "$12,000", chip: "Paid $4,000", sub: "Next due Dec 1" },
    listTitle: "Categories",
    items: [
      { label: "Attire", note: "Paid $1,200", tone: "good" },
      { label: "Photo", note: "Paid $1,500", tone: "good" },
      { label: "Florals", note: "Budget $2,800", tone: "neutral" },
      { label: "Food", note: "Due Jan 15", tone: "warn" },
    ],
    bulletsTitle: "Also on the grid",
    bullets: ["Misc budget $800", "Photo next due Nov 1", "Food next due Jan 15"],
  },
  "budget-item": {
    hero: {
      label: "Attire",
      value: "$1,200",
      chip: "Paid",
      sub: "Budget $3,500 · +$2,300",
    },
    listTitle: "Payments",
    items: [{ label: "Suit deposit", note: "Jul 1, 2026", tone: "good" }],
    progress: { label: "Paid", value: "$1,200 of $3,500", pct: 34 },
    bulletsTitle: "This line",
    bullets: ["Budget $3,500", "Paid $1,200", "Room left +$2,300"],
  },
  overview: {
    hero: { label: "Elena & Marcus", value: "6 months", chip: "Feb 14, 2027", sub: "Wedding overview" },
    progress: { label: "Paid so far", value: "$6,700 of $45,000", pct: 15 },
    bulletsTitle: "Needs attention",
    bullets: ["Florist still to book", "43 guests pending", "3 categories untracked"],
  },
  "white-label": {
    hero: { label: "Elena & Marcus", value: "6 months", chip: "Your brand", sub: "Feb 14, 2027" },
    bulletsTitle: "Their workspace",
    bullets: ["Your name on the overview", "Your logo and accent", "Couples never see First Look"],
  },
  seating: {
    hero: { label: "Floor plan", value: "12 tables", chip: "Drag", sub: "Elena & Marcus" },
    listTitle: "Roster",
    items: [
      { label: "Head table", note: "Seated", tone: "good" },
      { label: "Family", note: "2 open", tone: "warn" },
    ],
    bulletsTitle: "How it goes",
    bullets: ["Drag a guest", "Drop them at a table", "Share the plan"],
  },
  branding: {
    hero: { label: "Your brand", value: "Accent", chip: "Live", sub: "Name, logo, and color" },
    bulletsTitle: "What couples see",
    bullets: ["Your wordmark", "Your accent", "A live preview"],
  },
};

export function surfaceLayout(slug: string): Extract<SlideLayout, "headline-card" | "headline-phone"> | null {
  if (slug === "website" || PHONE[slug]) return "headline-phone";
  if (CARD[slug]) return "headline-card";
  return null;
}

export function surfaceData(slug: string, shot?: WebsiteShot): Record<string, unknown> | null {
  if (slug === "website") return websiteSurface(shot && isWebsiteShot(shot) ? shot : "where-when");
  if (PHONE[slug]) return PHONE[slug];
  if (CARD[slug]) return CARD[slug];
  return null;
}
