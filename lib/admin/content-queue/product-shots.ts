/**
 * Named product screens for KIE i2i. Source PNGs live in
 * design/product-shots/{slug}.png; the same files must exist at
 * content-queue-assets/product/{slug}.png. Generate throws if a matched
 * shot is missing — never silently fall back to inventing UI.
 *
 * KIE must isolate 1–2 UI fragments from the shot and compose them as
 * designed graphic elements. Never paste the screenshot (or a crop of it)
 * as a floating window / device frame.
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

const DEFAULT_COMPOSITION =
  "Place that white raised card on the mauve canvas with generous padding and a raised shadow so it feels built into the layout, like a marketing illustration of the product, not a photograph of a computer screen.";

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
      "one raised white overview card (countdown, a progress band, one needs-attention row)",
  },
  {
    slug: "checklist",
    path: "product/checklist.png",
    aliases: ["checklist", "task", "phases"],
    description: "Checklist board with phase groups",
    heroElement:
      "one raised white card of a single phase group with a few recessed task rows",
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
      "Budget tracker — 15% paid-so-far band with allocated / paid / committed wells",
    heroElement:
      "the wide 15% paid-so-far allocation band with the five money wells (Allocated $32,600, Unallocated $12,400, Actual $17,700, Paid so far $6,700, Committed $25,900) — keep those exact labels and numbers. Never relabel the wells as vendor categories. Never a pie, donut, or circular progress",
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
      "the six category cards as a designed grid filling the pin: attire, florals, food, misc, photo, venue — each with its real ramp bar, total paid, next-due line, and budget figure from the shot. Do not invent category names or swap in the 15% paid-so-far band",
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
      "the expanded attire item card as a tall raised graphic filling the pin: sage paid ramp, Budget $3,500 with +$2,300, and the Payments row $1,200 · Jul 1, 2026 · Suit deposit. Omit the empty payment-schedule form, vendor dropdown, and notes field if they clutter. Never a second window",
    composition: FILL_COMPOSITION,
  },
  {
    slug: "guests",
    path: "product/guests.png",
    aliases: ["guest", "rsvp", "headcount", "meal tally"],
    description: "Guest list with RSVP counts",
    heroElement:
      "one raised white card of a few guest/RSVP rows and a headcount figure",
  },
  {
    slug: "seating",
    path: "product/seating.png",
    aliases: ["seating", "floor plan", "table chart", "sweetheart"],
    description: "Seating canvas with tables and guest roster",
    heroElement:
      "one raised white fragment of a few tables, or the guest roster list — not the full seating chrome",
  },
  {
    slug: "website",
    path: "product/website.png",
    aliases: ["website", "wedding site", "template", "romance"],
    description: "Website editor with template and palette",
    heroElement:
      "one raised white card of the site preview or a template/palette chip",
  },
  {
    slug: "vendors",
    path: "product/vendors.png",
    aliases: ["vendor outreach", "shortlist", "still to book", "contacted"],
    description: "Project vendor outreach pipeline",
    heroElement:
      "one raised white card of vendor outreach rows with status pills (contacted, booked)",
  },
  {
    slug: "timeline",
    path: "product/timeline.png",
    aliases: ["timeline", "day-of", "run sheet", "ceremony", "cocktail hour"],
    description: "Day-of timeline with ceremony and reception",
    heroElement:
      "one raised white card of a few day-of timeline rows (ceremony, cocktail hour)",
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

export function screensForShot(shot: ProductShot): ProductShotScreen[] {
  return [
    { path: shot.path, description: shot.description },
    ...(shot.extraScreens ?? []),
  ];
}

function quotedAfter(text: string, label: RegExp): string | null {
  const match = text.match(label);
  if (!match || match.index == null) return null;
  const rest = text.slice(match.index + match[0].length);
  const open = rest[0];
  if (open !== "'" && open !== '"' && open !== "“") return null;
  const close = open === "“" ? "”" : open;
  for (let i = 1; i < rest.length; i++) {
    if (rest[i] !== close) continue;
    const next = rest[i + 1] ?? "";
    if (open === "'" && /[a-z]/i.test(next)) continue;
    return rest.slice(1, i).trim() || null;
  }
  return null;
}

export function extractSlideCopy(prompt: string): {
  headline: string;
  supporting: string | null;
} {
  const idea = prompt.match(/\[idea:\s*([^\]]+)\]/i)?.[1]?.trim();
  const headline =
    quotedAfter(prompt, /Headline(?: at top)?:\s*/i) ?? idea ?? "First Look";
  const supporting = quotedAfter(
    prompt,
    /supporting line(?: at bottom)?:\s*/i,
  );
  return { headline, supporting };
}

/**
 * Replace (do not prefix) planner copy that describes invented UI.
 * Screenshot images are 1…N (fragment sources); the locked layout is last.
 * The model must rebuild one UI motif as a designed card — never dump the shot.
 */
export function kiePromptForProductShot(
  shot: ProductShot,
  originalPrompt: string,
): string {
  const { headline, supporting } = extractSlideCopy(originalPrompt);
  const screens = screensForShot(shot);
  const layoutN = screens.length + 1;
  const screenLines = screens.map((screen, i) => {
    const n = i + 1;
    if (i === 0) {
      return `Image ${n} is a real First Look screenshot (${screen.description}). It is a SOURCE of product UI — labels, numbers, status colors, Soft stack cards and pills — not the graphic itself. Isolate and rebuild this one motif as a designed element: ${shot.heroElement}. ${shot.composition ?? DEFAULT_COMPOSITION} Keep the fragment's real copy, numbers, and status pills from image ${n}. Omit sidebar, top nav, browser chrome, URL bars, overlapping windows, laptop/phone frames, and leftover full-page layout. Do not invent new screens, logos, portals, buttons, or chrome that are not in image ${n}. If a label is unreadable, omit it.`;
    }
    const fragment =
      screen.heroElement ??
      "at most one tiny matching fragment of the same product";
    return `Image ${n} is another real First Look screenshot (${screen.description}). Optionally pull ${fragment}. Never place a second full screenshot, a crop of a whole window, or a fake comparison portal.`;
  });

  return [
    ...screenLines,
    `Image ${layoutN} is the locked post layout. Use it ONLY for outer margins and headline placement. Ignore its typeface, any fake UI drawn on it, and any serif or script lettering.`,
    `Any NEW type you add (headline, supporting line) must be Figtree: geometric sans-serif, weight 800 for the headline, 500 for supporting. Never serif, never script, never italic display, never Cormorant, never Great Vibes.`,
    `Slide canvas: mauve #F3EEF0, white raised cards, berry accent #C0396B, sage #2F6B54 for done states. No gold, florals, textured paper, or photographic ornament.`,
    `Headline: "${headline}".`,
    supporting ? `Supporting line: "${supporting}".` : "",
    `Forbidden: pasting the screenshot or a crop of it as a floating rectangle; device/laptop/phone mockups of the whole app; two overlapping UI windows; circular progress, pies, or donuts.`,
    `Do not depict Generic Portal, YOUR Portal, [AppName], Wedding Planner script logos, or any screen that is not in images 1–${screens.length}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

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
  // Type A/B are tip/story with no product UI — even if the planner tagged a surface.
  if (/\[type:\s*[AB]\]/i.test(text)) return null;

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
