import "server-only";

import {
  filledImagePaths,
  formatNeedsImages,
  isContentPostFormat,
  isFormatForPlatform,
  isIdeaFridayReady,
  slideCountFor,
} from "@/lib/admin/content-formats";
import {
  isActiveContentQueuePlatform,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import {
  DEFAULT_BATCH_SIZE,
  buildWeekPlan,
  contentQueueWeekOf,
  type LikedIdeaSlot,
  type PlannedPost,
} from "@/lib/admin/content-queue/plan";
import { renderAndStoreSlides } from "@/lib/admin/content-queue/render-slides";
import { selectSlideSpecs, type RecentStyle } from "@/lib/admin/content-queue/select-slide";
import { parseStoredSpecs, stylesFromSpecs, type SlideSpec } from "@/lib/admin/content-queue/slide-spec";
import { postingWeekMonday } from "@/lib/admin/content-week";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type QueueBatchResult = {
  weekOf: string;
  planned: number;
  inserted: number;
  tasked: number;
  retried: number;
  skippedExisting: boolean;
  errors: string[];
};

export type ProduceIdeaResult = {
  queueId: string | null;
  weekOf: string;
  planned: number;
  inserted: number;
  tasked: number;
  errors: string[];
};

export class ProduceIdeaError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "already_used" | "not_ready",
  ) {
    super(message);
    this.name = "ProduceIdeaError";
  }
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function loadRecentStyles(
  supabase: ServiceClient,
  platform: ContentQueuePlatform,
): Promise<RecentStyle[]> {
  const { data, error } = await supabase
    .from("content_queue")
    .select("slide_specs")
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => stylesFromSpecs(row.slide_specs));
}

function resolveMaxBatch(): number {
  const raw = Number(process.env.CONTENT_QUEUE_BATCH_SIZE);
  if (!Number.isFinite(raw)) return DEFAULT_BATCH_SIZE;
  return Math.min(DEFAULT_BATCH_SIZE, Math.max(1, Math.round(raw)));
}

function isAudience(value: unknown): value is AudienceGroup {
  return value === "couples" || value === "planner";
}

function asLikedIdeaSlot(row: {
  id: string | null;
  idea_text: string | null;
  comment: string | null;
  platform: string | null;
  format: string | null;
  audience_group: string | null;
  carousel_slides: number | null;
  intent?: string | null;
  week_start?: string | null;
}): LikedIdeaSlot | null {
  if (
    !isActiveContentQueuePlatform(row.platform) ||
    !isContentPostFormat(row.format) ||
    !isAudience(row.audience_group) ||
    !row.id ||
    !row.idea_text
  ) {
    return null;
  }
  if (!isFormatForPlatform(row.platform, row.format)) return null;
  if (
    !isIdeaFridayReady({
      rating: "up",
      platform: row.platform,
      format: row.format,
      audience_group: row.audience_group,
    })
  ) {
    return null;
  }
  return {
    id: row.id,
    idea_text: row.idea_text,
    comment: row.comment ?? null,
    platform: row.platform,
    format: row.format,
    audience_group: row.audience_group,
    carousel_slides: row.carousel_slides ?? null,
    intent: row.intent === "tip" || row.intent === "promo" ? row.intent : null,
  };
}

async function loadReadyIdeas(
  supabase: ServiceClient,
  limit: number,
): Promise<LikedIdeaSlot[]> {
  if (limit <= 0) return [];
  const { data, error } = await supabase
    .from("ideation_items")
    .select("id, idea_text, comment, platform, format, audience_group, carousel_slides, intent")
    .eq("rating", "up")
    .is("used_at", null)
    .not("platform", "is", null)
    .not("format", "is", null)
    .not("audience_group", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const slot = asLikedIdeaSlot(row);
    return slot ? [slot] : [];
  });
}

async function retryIncompleteJobs(
  supabase: ServiceClient,
  rows: {
    id: string;
    week_of: string;
    platform: ContentQueuePlatform;
    format: string | null;
    carousel_slides: number | null;
    image_paths: string[] | null;
    slide_specs: unknown;
  }[],
  errors: string[],
): Promise<number> {
  const retryRows = rows.filter((row) => {
    const format = isContentPostFormat(row.format) ? row.format : null;
    if (!formatNeedsImages(format)) return false;
    const expected = slideCountFor(format, row.carousel_slides);
    return filledImagePaths(row.image_paths).length < expected;
  });
  if (retryRows.length === 0) return 0;

  let retried = 0;
  for (const row of retryRows) {
    const format = isContentPostFormat(row.format) ? row.format : null;
    const expected = slideCountFor(format, row.carousel_slides);
    const specs = parseStoredSpecs(row.slide_specs);
    if (specs.length < expected) {
      errors.push(`${row.id}: missing slide spec`);
      continue;
    }
    try {
      await renderAndStoreSlides(supabase, { id: row.id, week_of: row.week_of }, specs.slice(0, expected));
      retried += expected;
    } catch (err) {
      const message = err instanceof Error ? err.message : "render failed";
      console.error("content-queue render retry:", row.id, err);
      errors.push(`${row.id}: ${message}`);
    }
  }
  return retried;
}

type ProducePostsResult = {
  planned: number;
  inserted: number;
  tasked: number;
  errors: string[];
  queueIds: string[];
};

async function produceQueuePosts(
  ideas: LikedIdeaSlot[],
  weekOf: string,
): Promise<ProducePostsResult> {
  const errors: string[] = [];
  const queueIds: string[] = [];
  if (ideas.length === 0) {
    return { planned: 0, inserted: 0, tasked: 0, errors, queueIds };
  }

  const supabase = createServiceRoleClient();
  const plan = await buildWeekPlan(ideas);
  const recentByPlatform = new Map<ContentQueuePlatform, RecentStyle[]>();

  let inserted = 0;
  let tasked = 0;
  const now = new Date().toISOString();

  for (const post of plan) {
    const slideCount = slideCountFor(post.format, post.carousel_slides);
    let recent = recentByPlatform.get(post.platform);
    if (!recent) {
      recent = await loadRecentStyles(supabase, post.platform);
      recentByPlatform.set(post.platform, recent);
    }
    const specs: SlideSpec[] = formatNeedsImages(post.format)
      ? selectSlideSpecs({
          platform: post.platform,
          contentType: post.content_type,
          fragments: post.fragments,
          recent,
        })
      : [];
    recent.push(
      ...specs.map((spec) => ({
        layout: spec.layout,
        theme: spec.theme,
        ...(spec.snippet ? { snippet: spec.snippet } : {}),
      })),
    );
    const { data: row, error: insertError } = await supabase
      .from("content_queue")
      .insert({
        platform: post.platform,
        pillar: post.pillar,
        content_type: post.content_type,
        prompt: post.prompt,
        caption: post.caption,
        image_paths: Array.from({ length: slideCount }, () => ""),
        status: "pending",
        week_of: weekOf,
        source_idea_id: post.sourceIdeaId,
        format: post.format,
        audience_group: post.audience_group,
        carousel_slides: post.carousel_slides,
        slide_prompts: post.prompts,
        slide_specs: specs,
        kie_task_ids: [],
      })
      .select("id")
      .single();

    if (insertError || !row) {
      const message = insertError?.message ?? "insert failed";
      console.error("content-queue-generate insert:", errMessage(post, message));
      errors.push(errMessage(post, message));
      continue;
    }
    inserted += 1;
    queueIds.push(row.id);

    const { error: usedError } = await supabase
      .from("ideation_items")
      .update({ used_at: now })
      .eq("id", post.sourceIdeaId)
      .is("used_at", null);
    if (usedError) {
      errors.push(`${post.platform}/${post.pillar}: marked used failed: ${usedError.message}`);
    }

    if (!formatNeedsImages(post.format) || specs.length === 0) continue;

    try {
      await renderAndStoreSlides(supabase, { id: row.id, week_of: weekOf }, specs);
      tasked += specs.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : "render failed";
      console.error("content-queue render:", row.id, err);
      errors.push(`${post.platform}/${post.pillar}: ${message}`);
    }
  }

  return { planned: plan.length, inserted, tasked, errors, queueIds };
}

export async function runWeeklyContentQueue(
  maxBatch = resolveMaxBatch(),
): Promise<QueueBatchResult> {
  if (!process.env.MODEL_API_KEY?.trim()) {
    throw new Error("MODEL_API_KEY is not configured.");
  }

  const weekOf = contentQueueWeekOf();
  const supabase = createServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("content_queue")
    .select(
      "id, week_of, platform, format, carousel_slides, image_paths, slide_specs",
    )
    .eq("week_of", weekOf)
    .order("created_at", { ascending: true });
  if (existingError) throw new Error(existingError.message);

  const errors: string[] = [];
  const rows = existing ?? [];
  const retried = await retryIncompleteJobs(supabase, rows, errors);

  const remaining = Math.max(0, maxBatch - rows.length);
  if (remaining === 0) {
    return {
      weekOf,
      planned: 0,
      inserted: 0,
      tasked: retried,
      retried,
      skippedExisting: true,
      errors,
    };
  }

  const ideas = await loadReadyIdeas(supabase, remaining);
  if (ideas.length === 0) {
    return {
      weekOf,
      planned: 0,
      inserted: 0,
      tasked: retried,
      retried,
      skippedExisting: false,
      errors,
    };
  }

  const produced = await produceQueuePosts(ideas, weekOf);
  errors.push(...produced.errors);

  return {
    weekOf,
    planned: produced.planned,
    inserted: produced.inserted,
    tasked: retried + produced.tasked,
    retried,
    skippedExisting: false,
    errors,
  };
}

export async function produceIdeaNow(ideaId: string): Promise<ProduceIdeaResult> {
  if (!process.env.MODEL_API_KEY?.trim()) {
    throw new Error("MODEL_API_KEY is not configured.");
  }

  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("ideation_items")
    .select(
      "id, idea_text, comment, rating, platform, format, audience_group, carousel_slides, intent, week_start, used_at",
    )
    .eq("id", ideaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) {
    throw new ProduceIdeaError("Idea not found.", "not_found");
  }
  if (row.used_at) {
    throw new ProduceIdeaError("This idea was already produced.", "already_used");
  }
  if (row.rating !== "up") {
    throw new ProduceIdeaError(
      "Like this idea and pick a platform, format, and audience first.",
      "not_ready",
    );
  }

  const slot = asLikedIdeaSlot(row);
  if (!slot) {
    throw new ProduceIdeaError(
      "Like this idea and pick a platform, format, and audience first.",
      "not_ready",
    );
  }

  const weekOf =
    typeof row.week_start === "string" && row.week_start
      ? row.week_start
      : postingWeekMonday();
  const produced = await produceQueuePosts([slot], weekOf);
  return {
    queueId: produced.queueIds[0] ?? null,
    weekOf,
    planned: produced.planned,
    inserted: produced.inserted,
    tasked: produced.tasked,
    errors: produced.errors,
  };
}

function errMessage(post: PlannedPost, message: string): string {
  return `${post.platform}/${post.pillar}: ${message}`;
}
