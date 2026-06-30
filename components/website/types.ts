export type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

export type RegistryLink = {
  label: string;
  url: string;
};

export type WeddingWebsiteContent = {
  hero: {
    names: string;
    date: string;
    tagline: string;
    showCountdown: boolean;
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
  };
  travel: {
    body: string;
    visible: boolean;
  };
  registry: {
    links: RegistryLink[];
    visible: boolean;
  };
  rsvp: {
    visible: boolean;
  };
};

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
    travel: { body: "", visible: false },
    registry: { links: [], visible: false },
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

function parseRegistryLinks(value: unknown): RegistryLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        label: asString(row.label, ""),
        url: asString(row.url, ""),
      };
    })
    .filter((item): item is RegistryLink => item !== null);
}

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
  const registry = (input.registry as Record<string, unknown> | undefined) ?? {};
  const rsvp = (input.rsvp as Record<string, unknown> | undefined) ?? {};

  return {
    hero: {
      names: asString(hero.names, base.hero.names),
      date: asString(hero.date, base.hero.date),
      tagline: asString(hero.tagline, base.hero.tagline),
      showCountdown: asBoolean(hero.showCountdown, base.hero.showCountdown),
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
      items: parseScheduleItems(schedule.items),
      visible: asBoolean(schedule.visible, base.schedule.visible),
    },
    travel: {
      body: asString(travel.body, base.travel.body),
      visible: asBoolean(travel.visible, base.travel.visible),
    },
    registry: {
      links: parseRegistryLinks(registry.links),
      visible: asBoolean(registry.visible, base.registry.visible),
    },
    rsvp: {
      visible: asBoolean(rsvp.visible, base.rsvp.visible),
    },
  };
}
