"use server";

import { revalidatePath } from "next/cache";
import {
  buildSeedContent,
  parseWeddingWebsiteContent,
  travelHasContent,
  type ScheduleItem,
  type TravelPlace,
  type TravelPlaceKind,
  type WeddingWebsiteContent,
  type WeddingWebsiteRow,
} from "@/components/website/types";
import { isValidWeddingTheme } from "@/components/website/themes";
import { isValidWeddingTemplate } from "@/components/website/templates/registry";
import { formatTimeOfDay } from "@/lib/timeline-aggregates";
import { createClient } from "@/utils/supabase/server";

function websitePath(projectId: string) {
  return `/projects/${projectId}/website`;
}

const CLOCK_TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const SCHEDULE_ITEMS_MAX = 40;

function normalizeScheduleItemTime(raw: string): string {
  const trimmed = raw.trim();
  if (!CLOCK_TIME_RE.test(trimmed)) return trimmed;
  return formatTimeOfDay(trimmed);
}

export async function setWeddingWebsiteSchedule(
  projectId: string,
  items: Array<{ time: string; title: string; description?: string }>,
): Promise<
  | { ok: true; count: number; summary: string }
  | { ok: false; error: string }
> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Provide at least one schedule item." };
  }
  if (items.length > SCHEDULE_ITEMS_MAX) {
    return {
      ok: false,
      error: `Schedule is limited to ${SCHEDULE_ITEMS_MAX} items.`,
    };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("wedding_websites")
    .select("content")
    .eq("project_id", projectId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!current) {
    return {
      ok: false,
      error:
        "No wedding website yet. Create it on the Website tab, then ask again.",
    };
  }

  const content = parseWeddingWebsiteContent(current.content);

  if (content.schedule.items.length > 0) {
    return {
      ok: false,
      error:
        "The website Schedule already has items. It will not be overwritten — edit it on the Website tab.",
    };
  }

  const normalized: ScheduleItem[] = [];
  for (const item of items) {
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) {
      return { ok: false, error: "Each schedule item needs a non-empty title." };
    }
    const time =
      typeof item.time === "string" ? normalizeScheduleItemTime(item.time) : "";
    const description =
      typeof item.description === "string" ? item.description.trim() : "";
    normalized.push({ time, title, description });
  }

  const result = await updateWeddingWebsite(projectId, {
    content: {
      schedule: {
        items: normalized,
        visible: content.schedule.visible,
      },
    },
  });

  if (!result.ok) {
    return result;
  }

  const count = normalized.length;
  return {
    ok: true,
    count,
    summary: `Filled ${count} schedule item${count === 1 ? "" : "s"} from your timeline.`,
  };
}

export type TravelFillInput = {
  /** Intro blurb. */
  intro?: string;
  /** Legacy alias for intro (older assistant tool calls). */
  body?: string;
  places?: Array<{
    kind?: string;
    name: string;
    detail?: string;
    url?: string;
    note?: string;
  }>;
};

function parseTravelFillKind(value: unknown): TravelPlaceKind {
  if (value === "stay" || value === "getting_there" || value === "other") {
    return value;
  }
  return "other";
}

function normalizeTravelFillPlaces(
  places: TravelFillInput["places"],
): TravelPlace[] {
  if (!Array.isArray(places)) return [];
  const out: TravelPlace[] = [];
  for (const item of places) {
    if (!item || typeof item !== "object") continue;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    const place: TravelPlace = {
      kind: parseTravelFillKind(item.kind),
      name,
    };
    if (typeof item.detail === "string" && item.detail.trim()) {
      place.detail = item.detail.trim();
    }
    if (typeof item.url === "string" && item.url.trim()) {
      place.url = item.url.trim();
    }
    if (typeof item.note === "string" && item.note.trim()) {
      place.note = item.note.trim();
    }
    out.push(place);
  }
  return out;
}

export async function setWeddingWebsiteTravel(
  projectId: string,
  input: TravelFillInput | string,
): Promise<
  | { ok: true; summary: string; visible: boolean }
  | { ok: false; error: string }
> {
  const payload: TravelFillInput =
    typeof input === "string" ? { intro: input } : input ?? {};

  const intro = (payload.intro ?? payload.body ?? "").trim();
  const places = normalizeTravelFillPlaces(payload.places);

  if (!intro && places.length === 0) {
    return {
      ok: false,
      error: "Provide an intro and/or at least one Travel place.",
    };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("wedding_websites")
    .select("content, slug")
    .eq("project_id", projectId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!current) {
    return {
      ok: false,
      error:
        "No wedding website yet. Create it on the Website tab, then ask again.",
    };
  }

  const content = parseWeddingWebsiteContent(current.content);

  if (travelHasContent(content.travel)) {
    return { ok: false, error: "travel_not_empty" };
  }

  const nextTravel = {
    body: intro,
    places,
    visible: content.travel.visible,
  };

  const result = await updateWeddingWebsite(projectId, {
    content: {
      travel: nextTravel,
    },
  });

  if (!result.ok) {
    return result;
  }

  const slug =
    typeof current.slug === "string" && current.slug.trim()
      ? current.slug.trim()
      : null;
  if (slug) {
    revalidatePath(`/w/${slug}`);
  }

  return {
    ok: true,
    visible: nextTravel.visible,
    summary:
      "Filled the Travel & Stay section. It may still be hidden — toggle it visible on the Website tab.",
  };
}

function rowToWebsite(row: Record<string, unknown>): WeddingWebsiteRow {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    slug: row.slug === null || row.slug === undefined ? null : String(row.slug),
    published: Boolean(row.published),
    template: String(row.template),
    theme: String(row.theme),
    content: parseWeddingWebsiteContent(row.content),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createWeddingWebsite(
  projectId: string,
): Promise<{ ok: true; website: WeddingWebsiteRow } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("wedding_websites")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    return { ok: true, website: rowToWebsite(existing) };
  }

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("name, wedding_date").eq("id", projectId).maybeSingle(),
    supabase
      .from("wedding_profile")
      .select("location")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const content = buildSeedContent(
    project?.name ?? "",
    project?.wedding_date ?? null,
    profile?.location ?? "",
  );

  const { data, error } = await supabase
    .from("wedding_websites")
    .insert({
      project_id: projectId,
      content,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(websitePath(projectId));
  return { ok: true, website: rowToWebsite(data) };
}

export async function updateWeddingWebsite(
  projectId: string,
  fields: {
    /** Full or partial content; missing keys fall back to the current blob via parse. */
    content?: WeddingWebsiteContent | Record<string, unknown>;
    template?: string;
    theme?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("wedding_websites")
    .select("content, template, theme, slug")
    .eq("project_id", projectId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!current) {
    return { ok: false, error: "Website not found." };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.content !== undefined) {
    updates.content = parseWeddingWebsiteContent(
      fields.content,
      parseWeddingWebsiteContent(current.content),
    );
  }

  if (fields.template !== undefined) {
    updates.template = isValidWeddingTemplate(fields.template)
      ? fields.template
      : current.template;
  }

  if (fields.theme !== undefined) {
    updates.theme = isValidWeddingTheme(fields.theme) ? fields.theme : current.theme;
  }

  const { error } = await supabase
    .from("wedding_websites")
    .update(updates)
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(websitePath(projectId));
  const slug =
    typeof current.slug === "string" && current.slug.trim()
      ? current.slug.trim()
      : null;
  if (slug) {
    revalidatePath(`/w/${slug}`);
    revalidatePath(`/w/${slug}/registry`);
  }
  return { ok: true };
}

export async function updateWeddingWebsiteSlug(
  projectId: string,
  rawSlug: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const normalized = rawSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  if (!normalized) {
    return { ok: false, error: "Enter a valid link — letters, numbers, and hyphens only." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("wedding_websites")
    .update({
      slug: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That link is taken — try another." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(websitePath(projectId));
  return { ok: true, slug: normalized };
}

export async function setWeddingWebsitePublished(
  projectId: string,
  published: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("wedding_websites")
    .update({
      published,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(websitePath(projectId));
  return { ok: true };
}

async function revalidateWebsitePublic(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wedding_websites")
    .select("slug")
    .eq("project_id", projectId)
    .maybeSingle();
  const slug =
    typeof data?.slug === "string" && data.slug.trim() ? data.slug.trim() : null;
  if (slug) {
    revalidatePath(`/w/${slug}`);
  }
}

/** Persist a public website-media URL onto content.hero.imageUrl. */
export async function setHeroImage(
  projectId: string,
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) {
    return { ok: false, error: "Image URL is required." };
  }

  const result = await updateWeddingWebsite(projectId, {
    content: {
      hero: { imageUrl: trimmed },
    } as Record<string, unknown>,
  });

  if (!result.ok) return result;

  await revalidateWebsitePublic(projectId);
  return { ok: true };
}

/** Clear content.hero.imageUrl (does not delete the storage object). */
export async function clearHeroImage(
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await updateWeddingWebsite(projectId, {
    content: {
      hero: { imageUrl: "" },
    } as Record<string, unknown>,
  });

  if (!result.ok) return result;

  await revalidateWebsitePublic(projectId);
  return { ok: true };
}
