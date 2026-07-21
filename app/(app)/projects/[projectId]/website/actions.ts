"use server";

import { revalidatePath } from "next/cache";
import {
  buildSeedContent,
  parseWeddingWebsiteContent,
  type ScheduleItem,
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
    .select("content, template, theme")
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
