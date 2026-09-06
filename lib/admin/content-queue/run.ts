import "server-only";

import {
  formatNeedsImages,
  isContentPostFormat,
  isFormatForPlatform,
  isIdeaFridayReady,
  slideCountFor,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  isContentQueuePlatform,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import {
  requestGeneration,
  resolveReferenceUrls,
} from "@/lib/admin/content-queue/generate";
import {
  DEFAULT_BATCH_SIZE,
  buildWeekPlan,
  contentQueueWeekOf,
  type LikedIdeaSlot,
  type PlannedPost,
} from "@/lib/admin/content-queue/plan";
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
type ReferenceUrls = Awaited<ReturnType<typeof resolveReferenceUrls>>;

async function attachImageJobs(
  supabase: ServiceClient,
  rowId: string,
  platform: ContentQueuePlatform,
  prompts: string[],
  references: ReferenceUrls,
  existingIds: string[] = [],
): Promise<number> {
  const taskIds = [...existingIds];
  let added = 0;
  for (let i = existingIds.length; i < prompts.length; i += 1) {
    const prompt = prompts[i];
    if (!prompt?.trim()) continue;
    const taskId = await requestGeneration({ platform, prompt }, references);
    taskIds.push(taskId);
    added += 1;
    const { error } = await supabase
      .from("content_queue")
      .update({
        kie_task_id: taskIds[0] ?? null,
        kie_task_ids: taskIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    if (error) {
      throw new Error(`Failed to store kie_task_ids: ${error.message}`);
    }
  }
  return added;
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
}): LikedIdeaSlot | null {
  if (
    !isContentQueuePlatform(row.platform) ||
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
  };
}

async function loadReadyIdeas(
  supabase: ServiceClient,
  limit: number,
): Promise<LikedIdeaSlot[]> {
  if (limit <= 0) return [];
  const { data, error } = await supabase
    .from("ideation_items")
    .select("id, idea_text, comment, platform, format, audience_group, carousel_slides")
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

function promptsForRow(row: {
  format: ContentPostFormat | null;
  carousel_slides: number | null;
  prompt: string;
  slide_prompts: string[] | null;
}): string[] {
  const n = slideCountFor(row.format, row.carousel_slides);
  if (n === 0) return [];
  const stored = (row.slide_prompts ?? []).filter((p) => p.trim().length > 0);
  if (stored.length >= n) return stored.slice(0, n);
  if (stored.length > 0) {
    const last = stored[stored.length - 1]!;
    return Array.from({ length: n }, (_, i) => stored[i] ?? last);
  }
  const fallback = row.prompt.trim();
  return fallback ? Array.from({ length: n }, () => fallback) : [];
}

function taskIdsForRow(row: {
  kie_task_id: string | null;
  kie_task_ids: string[] | null;
}): string[] {
  if ((row.kie_task_ids ?? []).length > 0) return row.kie_task_ids ?? [];
  return row.kie_task_id ? [row.kie_task_id] : [];
}

async function retryIncompleteJobs(
  supabase: ServiceClient,
  rows: {
    id: string;
    platform: ContentQueuePlatform;
    prompt: string;
    kie_task_id: string | null;
    kie_task_ids: string[] | null;
    format: string | null;
    carousel_slides: number | null;
    slide_prompts: string[] | null;
  }[],
  errors: string[],
): Promise<number> {
  const retryRows = rows.filter((row) => {
    const format = isContentPostFormat(row.format) ? row.format : null;
    if (!formatNeedsImages(format)) return false;
    const expected = slideCountFor(format, row.carousel_slides);
    const ids = taskIdsForRow(row);
    return ids.length < expected;
  });

  if (retryRows.length === 0) return 0;
  if (!process.env.KIE_API_KEY?.trim()) {
    throw new Error("KIE_API_KEY is not configured.");
  }

  const references = await resolveReferenceUrls();
  let retried = 0;
  for (const row of retryRows) {
    try {
      const format = isContentPostFormat(row.format) ? row.format : null;
      const prompts = promptsForRow({
        format,
        carousel_slides: row.carousel_slides,
        prompt: row.prompt,
        slide_prompts: row.slide_prompts,
      });
      const added = await attachImageJobs(
        supabase,
        row.id,
        row.platform,
        prompts,
        references,
        taskIdsForRow(row),
      );
      retried += added;
    } catch (err) {
      const message = err instanceof Error ? err.message : "createTask failed";
      console.error("content-queue-generate retry:", row.id, err);
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
  const needsKie = plan.some((post) => formatNeedsImages(post.format));
  if (needsKie && !process.env.KIE_API_KEY?.trim()) {
    throw new Error("KIE_API_KEY is not configured.");
  }
  const references = needsKie ? await resolveReferenceUrls() : null;

  let inserted = 0;
  let tasked = 0;
  const now = new Date().toISOString();

  for (const post of plan) {
    const slideCount = slideCountFor(post.format, post.carousel_slides);
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

    if (!formatNeedsImages(post.format) || !references) continue;

    try {
      const added = await attachImageJobs(
        supabase,
        row.id,
        post.platform,
        post.prompts,
        references,
      );
      tasked += added;
    } catch (err) {
      const message = err instanceof Error ? err.message : "createTask failed";
      console.error("content-queue-generate createTask:", row.id, err);
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
      "id, platform, prompt, kie_task_id, kie_task_ids, format, carousel_slides, slide_prompts",
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

  const weekOf = contentQueueWeekOf();
  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("ideation_items")
    .select(
      "id, idea_text, comment, rating, platform, format, audience_group, carousel_slides, used_at",
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
