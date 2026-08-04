export type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

export type GalleryImage = {
  url: string;
  caption?: string;
};

export type PartyMember = {
  name: string;
  role?: string;
  imageUrl?: string;
};

/** Party section arrangement. Undefined === stacked (today's default). */
export type PartyLayout = "stacked" | "horizontal" | "vertical";

/**
 * Schedule / timeline arrangement on the public site.
 * Undefined resolves to centered (fixes the old left-rail bias).
 */
export type ScheduleLayout = "centered" | "rail" | "alternating";

/** Photo frame shape for gallery / party tiles. Undefined === template default. */
export type PhotoShape = "rect" | "square" | "circle" | "arch";

/**
 * Reorderable body sections on the public site (hero / RSVP / registry stay fixed).
 * Undefined `sectionOrder` resolves to DEFAULT_SECTION_ORDER.
 */
export type WebsiteSectionId =
  | "story"
  | "details"
  | "schedule"
  | "gallery"
  | "party"
  | "travel"
  | "faq";

export const DEFAULT_SECTION_ORDER: readonly WebsiteSectionId[] = [
  "story",
  "details",
  "schedule",
  "gallery",
  "party",
  "travel",
  "faq",
] as const;

export function isWebsiteSectionId(value: string): value is WebsiteSectionId {
  return (DEFAULT_SECTION_ORDER as readonly string[]).includes(value);
}

/** Drop unknowns, de-dupe, append any missing defaults. */
export function normalizeSectionOrder(
  order: readonly string[] | undefined | null,
): WebsiteSectionId[] {
  const seen = new Set<WebsiteSectionId>();
  const out: WebsiteSectionId[] = [];
  for (const id of order ?? []) {
    if (isWebsiteSectionId(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export type FaqItem = {
  question: string;
  answer: string;
};

export type TravelPlaceKind = "stay" | "getting_there" | "other";

export type TravelPlace = {
  kind: TravelPlaceKind;
  name: string;
  /** Address, distance, or short description. */
  detail?: string;
  /** Optional booking / maps link (http/https only when rendered). */
  url?: string;
  /** Block code, rate note, etc. */
  note?: string;
};

export const TRAVEL_PLACE_KINDS: {
  value: TravelPlaceKind;
  label: string;
}[] = [
  { value: "stay", label: "Stay" },
  { value: "getting_there", label: "Getting there" },
  { value: "other", label: "Other" },
];

export function travelPlaceKindLabel(kind: TravelPlaceKind): string {
  return TRAVEL_PLACE_KINDS.find((row) => row.value === kind)?.label ?? "Other";
}

/** Section has guest-facing content (intro and/or named places). */
export function travelHasContent(travel: {
  body: string;
  places: TravelPlace[];
}): boolean {
  if (travel.body.trim()) return true;
  return travel.places.some((place) => place.name.trim().length > 0);
}

/** Safe http(s) URL for public links — otherwise undefined. */
export function sanitizeTravelUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export type WeddingWebsiteContent = {
  hero: {
    names: string;
    date: string;
    tagline: string;
    showCountdown: boolean;
    /** Public URL from website-media bucket; omit/empty = no hero photo. */
    imageUrl?: string;
  };
  story: {
    heading: string;
    body: string;
    visible: boolean;
  };
  details: {
    ceremonyVenue: string;
    ceremonyAddress: string;
    ceremonyTime: string;
    receptionVenue: string;
    receptionAddress: string;
    receptionTime: string;
    visible: boolean;
  };
  schedule: {
    items: ScheduleItem[];
    visible: boolean;
    /** Undefined === centered. */
    layout?: ScheduleLayout;
  };
  travel: {
    /** Intro blurb; also the legacy freeform field. */
    body: string;
    places: TravelPlace[];
    visible: boolean;
  };
  gallery: {
    visible: boolean;
    images: GalleryImage[];
    /** Undefined === template-chosen shape. */
    imageShape?: PhotoShape;
  };
  party: {
    visible: boolean;
    heading?: string;
    /** Undefined === stacked (today's full-width blocks). */
    layout?: PartyLayout;
    /** Undefined === template-chosen shape. */
    imageShape?: PhotoShape;
    members: PartyMember[];
  };
  faq: {
    visible: boolean;
    heading?: string;
    items: FaqItem[];
  };
  /** Kept for content-jsonb parse compat; native registry sub-page removed (REG-06). */
  registry: {
    visible: boolean;
  };
  rsvp: {
    visible: boolean;
  };
  /**
   * Order of body sections on the public site.
   * Undefined === DEFAULT_SECTION_ORDER. Hero / RSVP / registry stay fixed.
   */
  sectionOrder?: WebsiteSectionId[];
};

export function resolveSectionOrder(
  content: Pick<WeddingWebsiteContent, "sectionOrder">,
): WebsiteSectionId[] {
  return normalizeSectionOrder(content.sectionOrder);
}

export type WeddingWebsiteRow = {
  id: string;
  project_id: string;
  slug: string | null;
  published: boolean;
  template: string;
  theme: string;
  content: WeddingWebsiteContent;
  created_at: string;
  updated_at: string;
};

function emptyContent(): WeddingWebsiteContent {
  return {
    hero: { names: "", date: "", tagline: "", showCountdown: true },
    story: { heading: "Our Story", body: "", visible: true },
    details: {
      ceremonyVenue: "",
      ceremonyAddress: "",
      ceremonyTime: "",
      receptionVenue: "",
      receptionAddress: "",
      receptionTime: "",
      visible: true,
    },
    schedule: { items: [], visible: true },
    travel: { body: "", places: [], visible: false },
    gallery: { visible: false, images: [] },
    party: { visible: false, members: [] },
    faq: { visible: false, items: [] },
    registry: { visible: false },
    rsvp: { visible: false },
  };
}

export function buildSeedContent(
  names: string,
  weddingDate: string | null,
  ceremonyVenue: string,
): WeddingWebsiteContent {
  const base = emptyContent();
  return {
    ...base,
    hero: {
      ...base.hero,
      names,
      date: weddingDate ?? "",
    },
    details: {
      ...base.details,
      ceremonyVenue,
    },
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Non-string → keep fallback; empty/whitespace → undefined (cleared). */
function parseOptionalImageUrl(
  value: unknown,
  fallback: string | undefined,
): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseOptionalHeading(
  value: unknown,
  fallback: string | undefined,
): string | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parsePartyLayout(
  value: unknown,
  fallback: PartyLayout | undefined,
): PartyLayout | undefined {
  if (value === undefined) return fallback;
  if (value === "stacked" || value === "horizontal" || value === "vertical") {
    return value;
  }
  return fallback;
}

function parseScheduleLayout(
  value: unknown,
  fallback: ScheduleLayout | undefined,
): ScheduleLayout | undefined {
  if (value === undefined) return fallback;
  if (value === "centered" || value === "rail" || value === "alternating") {
    return value;
  }
  return fallback;
}

function parsePhotoShape(
  value: unknown,
  fallback: PhotoShape | undefined,
): PhotoShape | undefined {
  // null / "" = explicit clear (do not keep the previously saved shape).
  if (value === null || value === "") return undefined;
  if (value === undefined) return fallback;
  if (
    value === "rect" ||
    value === "square" ||
    value === "circle" ||
    value === "arch"
  ) {
    return value;
  }
  return fallback;
}

function parseSectionOrder(
  value: unknown,
  fallback: WebsiteSectionId[] | undefined,
): WebsiteSectionId[] | undefined {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) return fallback;
  const ids = value.filter(
    (item): item is string => typeof item === "string",
  );
  return normalizeSectionOrder(ids);
}


function parseScheduleItems(value: unknown): ScheduleItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        time: asString(row.time, ""),
        title: asString(row.title, ""),
        description: asString(row.description, ""),
      };
    })
    .filter((item): item is ScheduleItem => item !== null);
}

function parseGalleryImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  const out: GalleryImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.url !== "string") continue;
    const url = row.url.trim();
    if (!url) continue;
    const caption =
      typeof row.caption === "string" && row.caption.trim()
        ? row.caption.trim()
        : undefined;
    out.push(caption ? { url, caption } : { url });
  }
  return out;
}

function parsePartyMembers(value: unknown): PartyMember[] {
  if (!Array.isArray(value)) return [];
  const out: PartyMember[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    // Keep draft rows (empty name) so the editor can persist mid-edit.
    if (typeof row.name !== "string") continue;
    const name = row.name;
    const role =
      typeof row.role === "string" && row.role.trim()
        ? row.role.trim()
        : undefined;
    const imageUrl =
      typeof row.imageUrl === "string" && row.imageUrl.trim()
        ? row.imageUrl.trim()
        : undefined;
    const member: PartyMember = { name };
    if (role) member.role = role;
    if (imageUrl) member.imageUrl = imageUrl;
    out.push(member);
  }
  return out;
}

function parseFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  const out: FaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    // Keep draft rows (empty Q/A) so the editor can persist mid-edit.
    if (typeof row.question !== "string" || typeof row.answer !== "string") {
      continue;
    }
    out.push({ question: row.question, answer: row.answer });
  }
  return out;
}

function parseTravelPlaceKind(value: unknown): TravelPlaceKind {
  if (value === "stay" || value === "getting_there" || value === "other") {
    return value;
  }
  return "other";
}

function parseTravelPlaces(value: unknown): TravelPlace[] {
  if (!Array.isArray(value)) return [];
  const out: TravelPlace[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    // Keep draft rows (empty name) so the editor can persist mid-edit.
    if (typeof row.name !== "string") continue;
    const place: TravelPlace = {
      kind: parseTravelPlaceKind(row.kind),
      name: row.name,
    };
    if (typeof row.detail === "string" && row.detail.trim()) {
      place.detail = row.detail.trim();
    }
    if (typeof row.url === "string" && row.url.trim()) {
      place.url = row.url.trim();
    }
    if (typeof row.note === "string" && row.note.trim()) {
      place.note = row.note.trim();
    }
    out.push(place);
  }
  return out;
}

/**
 * Normalize raw jsonb into WeddingWebsiteContent.
 * Missing keys fall back to `fallback` (or emptyContent).
 * Legacy rows without gallery/party/faq get hidden+empty defaults — never throws.
 */
export function parseWeddingWebsiteContent(
  raw: unknown,
  fallback?: WeddingWebsiteContent,
): WeddingWebsiteContent {
  const base = fallback ?? emptyContent();
  if (!raw || typeof raw !== "object") return base;

  const input = raw as Record<string, unknown>;
  const hero = (input.hero as Record<string, unknown> | undefined) ?? {};
  const story = (input.story as Record<string, unknown> | undefined) ?? {};
  const details = (input.details as Record<string, unknown> | undefined) ?? {};
  const schedule = (input.schedule as Record<string, unknown> | undefined) ?? {};
  const travel = (input.travel as Record<string, unknown> | undefined) ?? {};
  const gallery = (input.gallery as Record<string, unknown> | undefined) ?? {};
  const party = (input.party as Record<string, unknown> | undefined) ?? {};
  const faq = (input.faq as Record<string, unknown> | undefined) ?? {};
  const registry = (input.registry as Record<string, unknown> | undefined) ?? {};
  const rsvp = (input.rsvp as Record<string, unknown> | undefined) ?? {};

  return {
    hero: {
      names: asString(hero.names, base.hero.names),
      date: asString(hero.date, base.hero.date),
      tagline: asString(hero.tagline, base.hero.tagline),
      showCountdown: asBoolean(hero.showCountdown, base.hero.showCountdown),
      imageUrl: parseOptionalImageUrl(hero.imageUrl, base.hero.imageUrl),
    },
    story: {
      heading: asString(story.heading, base.story.heading),
      body: asString(story.body, base.story.body),
      visible: asBoolean(story.visible, base.story.visible),
    },
    details: {
      ceremonyVenue: asString(details.ceremonyVenue, base.details.ceremonyVenue),
      ceremonyAddress: asString(
        details.ceremonyAddress,
        base.details.ceremonyAddress,
      ),
      ceremonyTime: asString(details.ceremonyTime, base.details.ceremonyTime),
      receptionVenue: asString(details.receptionVenue, base.details.receptionVenue),
      receptionAddress: asString(
        details.receptionAddress,
        base.details.receptionAddress,
      ),
      receptionTime: asString(details.receptionTime, base.details.receptionTime),
      visible: asBoolean(details.visible, base.details.visible),
    },
    schedule: {
      items:
        schedule.items === undefined
          ? base.schedule.items
          : parseScheduleItems(schedule.items),
      visible: asBoolean(schedule.visible, base.schedule.visible),
      layout: parseScheduleLayout(schedule.layout, base.schedule.layout),
    },
    travel: {
      body: asString(travel.body, base.travel.body),
      places:
        travel.places === undefined
          ? base.travel.places
          : parseTravelPlaces(travel.places),
      visible: asBoolean(travel.visible, base.travel.visible),
    },
    gallery: {
      visible: asBoolean(gallery.visible, base.gallery.visible),
      images:
        gallery.images === undefined
          ? base.gallery.images
          : parseGalleryImages(gallery.images),
      imageShape: parsePhotoShape(gallery.imageShape, base.gallery.imageShape),
    },
    party: {
      visible: asBoolean(party.visible, base.party.visible),
      heading: parseOptionalHeading(party.heading, base.party.heading),
      layout: parsePartyLayout(party.layout, base.party.layout),
      imageShape: parsePhotoShape(party.imageShape, base.party.imageShape),
      members:
        party.members === undefined
          ? base.party.members
          : parsePartyMembers(party.members),
    },
    faq: {
      visible: asBoolean(faq.visible, base.faq.visible),
      heading: parseOptionalHeading(faq.heading, base.faq.heading),
      items:
        faq.items === undefined ? base.faq.items : parseFaqItems(faq.items),
    },
    registry: {
      visible: asBoolean(registry.visible, base.registry.visible),
    },
    rsvp: {
      visible: asBoolean(rsvp.visible, base.rsvp.visible),
    },
    sectionOrder: parseSectionOrder(input.sectionOrder, base.sectionOrder),
  };
}
