/**
 * Named product screens for KIE i2i. Source PNGs live in
 * design/product-shots/{slug}.png; upload the same files to
 * content-queue-assets/product/{slug}.png before generate can attach them.
 * Missing storage objects are skipped — layout template still goes out.
 */
export type ProductShot = {
  slug: string;
  path: string;
  aliases: string[];
  description: string;
};

export const PRODUCT_SHOTS: ProductShot[] = [
  {
    slug: "white-label",
    path: "product/white-label.png",
    aliases: [
      "white label",
      "white-label",
      "your brand",
      "own brand",
      "elm & ivy",
      "clients never see",
    ],
    description: "Landing comparison: default First Look vs planner branding",
  },
  {
    slug: "dashboard",
    path: "product/dashboard.png",
    aliases: ["dashboard", "all your weddings", "book of weddings", "at a glance"],
    description: "Planner dashboard with active weddings",
  },
  {
    slug: "leads",
    path: "product/leads.png",
    aliases: ["leads", "pipeline", "inquiry", "crm", "kanban"],
    description: "Leads kanban with inquiry intake",
  },
  {
    slug: "automations",
    path: "product/automations.png",
    aliases: ["automation", "workflow", "welcome note"],
    description: "Automations template gallery",
  },
  {
    slug: "calendar",
    path: "product/calendar.png",
    aliases: ["calendar", "across weddings", "meetings, visits"],
    description: "Planner calendar across active weddings",
  },
  {
    slug: "vendor-library",
    path: "product/vendor-library.png",
    aliases: ["vendor library", "preferred vendors", "vendor book"],
    description: "Account-wide vendor library",
  },
  {
    slug: "branding",
    path: "product/branding.png",
    aliases: ["branding", "logo and accent", "live preview"],
    description: "Account branding / white-label settings",
  },
  {
    slug: "overview",
    path: "product/overview.png",
    aliases: ["overview", "countdown", "needs attention"],
    description: "Wedding overview with progress cards",
  },
  {
    slug: "checklist",
    path: "product/checklist.png",
    aliases: ["checklist", "task", "phases"],
    description: "Checklist board with phase groups",
  },
  {
    slug: "budget",
    path: "product/budget.png",
    aliases: ["budget", "spent", "allocated", "paid so far"],
    description: "Budget tracker with category bars",
  },
  {
    slug: "guests",
    path: "product/guests.png",
    aliases: ["guest", "rsvp", "headcount", "meal tally"],
    description: "Guest list with RSVP counts",
  },
  {
    slug: "seating",
    path: "product/seating.png",
    aliases: ["seating", "floor plan", "table chart", "sweetheart"],
    description: "Seating canvas with tables and guest roster",
  },
  {
    slug: "website",
    path: "product/website.png",
    aliases: ["website", "wedding site", "template", "romance"],
    description: "Website editor with template and palette",
  },
  {
    slug: "vendors",
    path: "product/vendors.png",
    aliases: ["vendor outreach", "shortlist", "still to book", "contacted"],
    description: "Project vendor outreach pipeline",
  },
  {
    slug: "timeline",
    path: "product/timeline.png",
    aliases: ["timeline", "day-of", "run sheet", "ceremony", "cocktail hour"],
    description: "Day-of timeline with ceremony and reception",
  },
  {
    slug: "invoices",
    path: "product/invoices.png",
    aliases: ["invoice", "bill a client", "retainer"],
    description: "Project invoices",
  },
];

const PRODUCT_SHOT_PROMPT_PREFIX =
  "Image 1 is the locked First Look post layout — keep its composition, type, and palette. Image 2 is a real First Look screen — place that exact UI in the device or frame. Do not invent dashboards, portals, chrome, or copy that is not in image 2.";

export function productShotPromptPrefix(): string {
  return PRODUCT_SHOT_PROMPT_PREFIX;
}

/** Longest alias wins so "vendor library" beats "vendor". */
export function matchProductShot(text: string): ProductShot | null {
  const hay = text.toLowerCase();
  let best: { shot: ProductShot; len: number } | null = null;
  for (const shot of PRODUCT_SHOTS) {
    for (const alias of shot.aliases) {
      if (!hay.includes(alias)) continue;
      if (!best || alias.length > best.len) {
        best = { shot, len: alias.length };
      }
    }
  }
  return best?.shot ?? null;
}
