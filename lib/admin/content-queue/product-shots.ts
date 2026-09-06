/**
 * Named product screens for KIE i2i. Source PNGs live in
 * design/product-shots/{slug}.png; the same files must exist at
 * content-queue-assets/product/{slug}.png. Generate throws if a matched
 * shot is missing — never silently fall back to inventing UI.
 */
export type ProductShotScreen = {
  path: string;
  description: string;
};

export type ProductShot = {
  slug: string;
  /** Hero screenshot — sent as image 1. */
  path: string;
  aliases: string[];
  description: string;
  /** Extra real screens (image 2…). Layout template is always last. */
  extraScreens?: ProductShotScreen[];
};

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
    extraScreens: [
      {
        path: "product/branding.png",
        description:
          "Account branding settings — real white-label name, logo, and accent controls",
      },
    ],
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
 * Screenshot images are 1…N; the locked layout is last.
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
      return `Image ${n} is a real First Look screenshot (${screen.description}). Composite those EXACT pixels as the hero UI in the device or screenshot frame. Do not redraw, restyle, recolor, or invent any UI, logos, copy, sidebars, buttons, portals, or chrome. Every label, number, and layout pixel of the app must match image ${n}.`;
    }
    return `Image ${n} is another real First Look screenshot (${screen.description}). Use it only as a small supporting crop of the same product — never as an excuse to invent a second fake portal.`;
  });

  return [
    ...screenLines,
    `Image ${layoutN} is the locked post layout. Use it ONLY for outer margins and headline placement. Ignore its typeface, any fake UI drawn on it, and any serif or script lettering.`,
    `Any NEW type you add (headline, supporting line) must be Figtree: geometric sans-serif, weight 800 for the headline, 500 for supporting. Never serif, never script, never italic display, never Cormorant, never Great Vibes.`,
    `Slide canvas: mauve #F3EEF0, white raised cards, berry accent #C0396B, sage #2F6B54 for done states. No gold, florals, textured paper, or photographic ornament.`,
    `Headline: "${headline}".`,
    supporting ? `Supporting line: "${supporting}".` : "",
    `Do not depict Generic Portal, YOUR Portal, [AppName], Wedding Planner script logos, or any screen that is not in images 1–${screens.length}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Longest alias wins so "vendor library" beats "vendor". [surface: slug] wins outright. */
export function matchProductShot(text: string): ProductShot | null {
  const tagged = text.match(/\[surface:\s*([a-z0-9-]+)\]/i)?.[1]?.toLowerCase();
  if (tagged) {
    const shot = PRODUCT_SHOTS.find((s) => s.slug === tagged);
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
