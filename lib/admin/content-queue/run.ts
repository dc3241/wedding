import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  requestGeneration,
  resolveReferenceUrls,
} from "@/lib/admin/content-queue/generate";
import {
  DEFAULT_BATCH_SIZE,
  buildWeekPlan,
  contentQueueWeekOf,
  type PlannedPost,
} from "@/lib/admin/content-queue/plan";

export type QueueBatchResult = {
  weekOf: string;
  planned: number;
  inserted: number;
  tasked: number;
  retried: number;
  skippedExisting: boolean;
  errors: string[];
};

async function attachTaskId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  rowId: string,
  post: Pick<PlannedPost, "platform" | "prompt">,
  references: Awaited<ReturnType<typeof resolveReferenceUrls>>,
): Promise<void> {
  const taskId = await requestGeneration(post, references);
  const { error } = await supabase
    .from("content_queue")
    .update({
      kie_task_id: taskId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId);
  if (error) {
    throw new Error(`Failed to store kie_task_id: ${error.message}`);
  }
}

function resolveBatchSize(): number {
  const raw = Number(process.env.CONTENT_QUEUE_BATCH_SIZE);
  if (!Number.isFinite(raw)) return DEFAULT_BATCH_SIZE;
  return Math.min(12, Math.max(9, Math.round(raw)));
}

export async function runWeeklyContentQueue(
  batchSize = resolveBatchSize(),
): Promise<QueueBatchResult> {
  if (!process.env.MODEL_API_KEY?.trim()) {
    throw new Error("MODEL_API_KEY is not configured.");
  }
  if (!process.env.KIE_API_KEY?.trim()) {
    throw new Error("KIE_API_KEY is not configured.");
  }

  const weekOf = contentQueueWeekOf();
  const supabase = createServiceRoleClient();
  const references = await resolveReferenceUrls();

  const { data: existing, error: existingError } = await supabase
    .from("content_queue")
    .select("id, platform, prompt, kie_task_id")
    .eq("week_of", weekOf)
    .order("created_at", { ascending: true });
  if (existingError) throw new Error(existingError.message);

  const errors: string[] = [];
  const rows = existing ?? [];

  if (rows.length > 0) {
    let retried = 0;
    for (const row of rows) {
      if (row.kie_task_id) continue;
      try {
        await attachTaskId(
          supabase,
          row.id,
          { platform: row.platform, prompt: row.prompt },
          references,
        );
        retried += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "createTask failed";
        console.error("content-queue-generate retry:", row.id, err);
        errors.push(`${row.id}: ${message}`);
      }
    }
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

  const plan = await buildWeekPlan(batchSize);
  let inserted = 0;
  let tasked = 0;

  for (const post of plan) {
    const { data: row, error: insertError } = await supabase
      .from("content_queue")
      .insert({
        platform: post.platform,
        pillar: post.pillar,
        content_type: post.content_type,
        prompt: post.prompt,
        caption: post.caption,
        image_paths: [],
        status: "pending",
        week_of: weekOf,
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

    try {
      await attachTaskId(supabase, row.id, post, references);
      tasked += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "createTask failed";
      console.error("content-queue-generate createTask:", row.id, err);
      errors.push(`${post.platform}/${post.pillar}: ${message}`);
    }
  }

  return {
    weekOf,
    planned: plan.length,
    inserted,
    tasked,
    retried: 0,
    skippedExisting: false,
    errors,
  };
}

function errMessage(post: PlannedPost, message: string): string {
  return `${post.platform}/${post.pillar}: ${message}`;
}
