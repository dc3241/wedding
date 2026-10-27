/**
 * Named product screens. Built-in PNGs live in design/product-shots and
 * content-queue-assets/product/. An admin upload on Product screens
 * (product_shot_uploads) replaces the primary image for that angle.
 * The still renderer draws a bezel and fills it with the uploaded
 * screenshot when one exists for the angle.
 */
export type ProductShotScreen = {
  path: string;
  description: string;
  /** Optional fragment to pull from this extra screen — never a second window. */
  heroElement?: string;
};

export type ProductShot = {
  slug: string;
  /** Source screenshot — sent as image 1. Fragment source, not the hero itself. */
  path: string;
  aliases: string[];
  description: string;
  /** The one product motif to rebuild as a designed card in the graphic. */
  heroElement: string;
  /**
   * How to place the rebuilt motif on the slide. Omit for the default
   * (one raised card with generous padding). Budget shots fill the pin.
   */
  composition?: string;
  /** Extra real screens (image 2…). Layout template is always last. */
  extraScreens?: ProductShotScreen[];
};

const FILL_COMPOSITION =
  "This motif IS the graphic: scale it to fill most of the canvas under the headline (roughly two-thirds of the frame). Large type and internal card padding, but little empty mauve around the motif. A wide progress band, a grid of category cards, or a tall item card — not a tiny floating widget.";

export const PRODUCT_SHOTS: ProductShot[] = [
  {
    slug: "white-label",
    path: "product/overview.png",
    aliases: [
      "white label",
      "white-label",
      "your brand",
      "own brand",
      "elm & ivy",
      "clients never see",
      "portal",
      "side-by-side",
      "generic portal",
    ],
    description:
      "Elena & Marcus wedding overview — the real First Look Soft stack UI",
    heroElement:
      "one raised white overview card with the countdown, task count, and budget figures as the couple's branded workspace — a short list of those stats, not the full dashboard",
    extraScreens: [
      {
        path: "product/branding.png",
        description:
          "Account branding settings — real white-label name, logo, and accent controls",
        heroElement:
          "a tiny branding chip (name, logo, or accent) only if it supports the same story — never a second floating window",
      },
    ],
  },
  {
    slug: "dashboard",
    path: "product/dashboard.png",
    aliases: ["dashboard", "all your weddings", "book of weddings", "at a glance"],
    description: "Planner dashboard with active weddings",
    heroElement:
      "one raised white card of a few active-wedding rows (couple names, dates, status pills) — a list, not the full planner shell",
  },
  {
    slug: "leads",
    path: "product/leads.png",
    aliases: ["leads", "pipeline", "inquiry", "crm", "kanban"],
    description: "Leads kanban with inquiry intake",
    heroElement:
      "one raised white card of lead rows with status pills (NEW, PROPOSAL, BOOKED) — a short list, not the full kanban board",
  },
  {
    slug: "automations",
    path: "product/automations.png",
    aliases: ["automation", "workflow", "welcome note"],
    description: "Automations template gallery",
    heroElement:
      "one raised white card of a few automation template tiles or a single workflow row",
  },
  {
    slug: "calendar",
    path: "product/calendar.png",
    aliases: ["calendar", "across weddings", "meetings, visits"],
    description: "Planner calendar across active weddings",
    heroElement:
      "one raised white calendar fragment (a week strip or a few event rows), not the full calendar chrome",
  },
  {
    slug: "vendor-library",
    path: "product/vendor-library.png",
    aliases: ["vendor library", "preferred vendors", "vendor book"],
    description: "Account-wide vendor library",
    heroElement:
      "one raised white card of a few preferred-vendor rows",
  },
  {
    slug: "branding",
    path: "product/branding.png",
    aliases: ["branding", "logo and accent", "live preview"],
    description: "Account branding / white-label settings",
    heroElement:
      "one raised white card of the branding controls (name, logo, accent) with a live-preview chip",
  },
  {
    slug: "overview",
    path: "product/overview.png",
    aliases: ["overview", "countdown", "needs attention"],
    description: "Wedding overview with progress cards",
    heroElement:
      "one raised white countdown card (130 days, Sunday February 14 2027) — the whole card, not a cropped page",
  },
  {
    slug: "checklist",
    path: "product/checklist.png",
    aliases: ["checklist", "task", "phases"],
    description: "Checklist board with phase groups",
    heroElement:
      "one raised white progress card: 30% done, 130 days to go, the phase pills, and the progress band — the whole card",
  },
  {
    slug: "budget",
    path: "product/budget.png",
    aliases: [
      "budget tracker",
      "paid so far",
      "auto-updating",
      "auto updating",
      "put aside",
      "allocated",
      "unallocated",
    ],
    description:
      "Budget tracker — paid vs plan band with budgeted / unallocated / left-to-pay wells",
    heroElement:
      "the raised paid card: $10,000 paid, $46,700 left on the $56,700 plan, the progress band (green paid, berry left to pay), and the wells Budgeted $56,700, Unallocated $15,300, Actual $30,000, Paid so far $10,000, Left to pay $46,700. Keep those labels and numbers. Never a percent of the total, and never a pie, donut, or circular progress",
    composition: FILL_COMPOSITION,
  },
  {
    slug: "budget-categories",
    path: "product/budget-categories.png",
    aliases: [
      "budget split",
      "budget categories",
      "category ramps",
      "where the money",
      "photographer or venue",
      "venue vs",
    ],
    description:
      "Budget category cards — attire, florals, food, misc, photo, venue with paid ramps",
    heroElement:
      "the six category cards as a designed grid filling the pin: attire, florals, food, misc, photo, venue — each with its real ramp bar, total paid, next-due line, and budget figure from the shot. Do not invent category names or swap in the paid-vs-plan summary band",
    composition: FILL_COMPOSITION,
  },
  {
    slug: "budget-item",
    path: "product/budget-item.png",
    aliases: [
      "payment schedule",
      "next due",
      "installment",
      "suit deposit",
      "add payment",
      "budget item",
    ],
    description:
      "Expanded attire budget item — paid ramp, deposit ledger, and notes",
    heroElement:
      "the photo line card: category photo, 1 unpaid, $6,200, the paid ramp, Total paid $2,000, Budget $6,200. The whole card, not a cropped page",
    composition: FILL_COMPOSITION,
  },
  {
    slug: "guests",
    path: "product/guests.png",
    aliases: ["guest", "rsvp", "headcount", "meal tally"],
    description: "Guest list with RSVP counts",
    heroElement:
      "one raised white RSVP count card: 140 people, 94 attending, 13 declined, 33 pending — all four figures, nothing cut off",
  },
  {
    slug: "seating",
    path: "product/seating.png",
    aliases: ["seating", "floor plan", "table chart", "sweetheart"],
    description: "Seating canvas with tables and guest roster",
    heroElement:
      "the seating floor plan card: the tables, sweetheart table, and dance floor, complete, not a cropped corner of the page",
  },
  {
    slug: "website",
    path: "product/website.png",
    aliases: ["website", "wedding site", "template", "romance"],
    description: "Website editor with template and palette",
    heroElement:
      "the Choose your look card: template chips (Romance selected) and the palette swatches, the whole control, not a cropped editor",
  },
  {
    slug: "vendors",
    path: "product/vendors.png",
    aliases: ["vendor outreach", "shortlist", "still to book", "contacted"],
    description: "Project vendor outreach pipeline",
    heroElement:
      "the Still to book card: Florist, Find vendors, and Ignore — the whole card",
  },
  {
    slug: "timeline",
    path: "product/timeline.png",
    aliases: ["timeline", "day-of", "run sheet", "ceremony", "cocktail hour"],
    description: "Day-of timeline with ceremony and reception",
    heroElement:
      "the Ceremony card and the Reception card (cocktail hour, dinner, dancing), both complete",
  },
  {
    slug: "invoices",
    path: "product/invoices.png",
    aliases: ["invoice", "bill a client", "retainer"],
    description: "Project invoices",
    heroElement:
      "one raised white card of invoice rows (retainer, amounts, status pills)",
  },
];

export const PRODUCT_SHOT_SLUGS = PRODUCT_SHOTS.map((s) => s.slug);

const BUDGET_CATEGORY_HINTS = [
  "budget split",
  "split formula",
  "categor",
  "where the money",
  "photographer or venue",
  "venue vs",
] as const;

const BUDGET_ITEM_HINTS = [
  "payment schedule",
  "next due",
  "installment",
  "suit deposit",
  "add payment",
  "budget item",
] as const;

function shotBySlug(slug: string): ProductShot | null {
  return PRODUCT_SHOTS.find((s) => s.slug === slug) ?? null;
}

/**
 * [surface: budget] is the generic tag. Pick the category-grid or item
 * variant when the prompt is clearly about a split or a single line.
 */
function pickBudgetVariant(text: string): ProductShot | null {
  const hay = text.toLowerCase();
  if (BUDGET_ITEM_HINTS.some((hint) => hay.includes(hint))) {
    return shotBySlug("budget-item");
  }
  if (BUDGET_CATEGORY_HINTS.some((hint) => hay.includes(hint))) {
    return shotBySlug("budget-categories");
  }
  return shotBySlug("budget");
}

/** Longest alias wins so "vendor library" beats "vendor". [surface: slug] wins outright. */
export function matchProductShot(text: string): ProductShot | null {
  // Type A/B are tip/story with no product UI — even if a surface was tagged.
  // [surface: none] is an explicit "headline only" slide so a tip carousel
  // can reveal the product on one frame and not the others.
  if (/\[type:\s*[AB]\]/i.test(text)) return null;
  if (/\[surface:\s*none\]/i.test(text)) return null;

  const tagged = text.match(/\[surface:\s*([a-z0-9-]+)\]/i)?.[1]?.toLowerCase();
  if (tagged) {
    if (tagged === "budget") return pickBudgetVariant(text);
    const shot = shotBySlug(tagged);
    if (shot) return shot;
  }

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
