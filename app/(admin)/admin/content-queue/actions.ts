"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  filledImagePaths,
  formatNeedsImages,
  imagesReadyForQueue,
  isContentPostFormat,
  slideCountFor,
} from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
import { requestGeneration } from "@/lib/admin/content-queue/generate";
import { createClient } from "@/utils/supabase/server";

/**
 * Every action here is an independently reachable POST endpoint once
 * built — the /admin route gate only protects the rendered page, not
 * the action itself. Each one re-checks is_admin() itself, on top of
 * the DB-level is_admin() RLS policy on content_queue.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

function revalidateQueueAndBank() {
  revalidatePath("/admin/content-queue");
  revalidatePath("/admin/couples/bank");
  revalidatePath("/admin/planner/bank");
  revalidatePath("/admin");
}

export async function approveContentQueueItem(id: string) {
  const supabase = await requireAdmin();
  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select(
      "id, platform, pillar, content_type, caption, format, audience_group, carousel_slides, image_paths, status",
    )
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Post not found");

  const format = isContentPostFormat(row.format) ? row.format : null;
  if (
    !imagesReadyForQueue({
      format,
      carousel_slides: row.carousel_slides,
      image_paths: row.image_paths,
    })
  ) {
    throw new Error("Wait for images before approving.");
  }

  const { data: existingBank } = await supabase
    .from("content_bank_items")
    .select("id")
    .eq("source_queue_id", id)
    .maybeSingle();

  const bankPayload = {
    platform: row.platform,
    idea: row.pillar,
    type: row.content_type,
    format: format ?? row.format,
    title: null,
    body: row.caption ?? "",
    notes: null,
    audience_group: row.audience_group,
    source_queue_id: id,
    image_paths: filledImagePaths(row.image_paths),
  };

  if (existingBank) {
    const { error: updateBankError } = await supabase
      .from("content_bank_items")
      .update({ ...bankPayload, updated_at: new Date().toISOString() })
      .eq("id", existingBank.id);
    if (updateBankError) throw new Error(updateBankError.message);
  } else {
    const { error: insertBankError } = await supabase
      .from("content_bank_items")
      .insert(bankPayload);
    if (insertBankError) throw new Error(insertBankError.message);
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("content_queue")
    .update({
      status: "approved",
      approved_at: now,
      denied_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateQueueAndBank();
}

export async function denyContentQueueItem(id: string) {
  const supabase = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("content_queue")
    .update({
      status: "denied",
      denied_at: now,
      approved_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content-queue");
}

export async function updateContentQueuePrompt(id: string, prompt: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("content_queue")
    .update({
      prompt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content-queue");
}

/**
 * Re-kick KIE for this row. Saves the (possibly edited) prompt, stores
 * new kie_task_ids, clears image_paths, sets status back to pending.
 * The webhook writes slides when each task completes. UGC skips KIE.
 */
export async function regenerateContentQueueItem(id: string, prompt: string) {
  const supabase = await requireAdmin();
  const trimmed = prompt.trim();

  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("id, platform, format, carousel_slides, slide_prompts")
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Post not found");

  const format = isContentPostFormat(row.format) ? row.format : null;
  const now = new Date().toISOString();

  if (!formatNeedsImages(format)) {
    const { error } = await supabase
      .from("content_queue")
      .update({
        prompt: trimmed,
        status: "pending",
        approved_at: null,
        denied_at: null,
        updated_at: now,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/content-queue");
    return;
  }

  const slidePrompts = (row.slide_prompts ?? []) as string[];
  if (!trimmed && !slidePrompts.some((p) => p.trim())) {
    throw new Error("Prompt is required.");
  }

  const expected = slideCountFor(format, row.carousel_slides);
  const stored = slidePrompts.filter((p) => p.trim().length > 0);
  const prompts =
    stored.length >= expected
      ? stored.slice(0, expected)
      : Array.from({ length: expected }, (_, i) => stored[i] ?? trimmed);

  const { error: promptError } = await supabase
    .from("content_queue")
    .update({
      prompt: trimmed || prompts[0] || "",
      slide_prompts: prompts,
      kie_task_id: null,
      kie_task_ids: [],
      image_paths: Array.from({ length: expected }, () => ""),
      status: "pending",
      approved_at: null,
      denied_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (promptError) throw new Error(promptError.message);

  const taskIds: string[] = [];
  for (const slidePrompt of prompts) {
    const taskId = await requestGeneration({
      platform: row.platform,
      prompt: slidePrompt,
    });
    taskIds.push(taskId);
    const { error: taskError } = await supabase
      .from("content_queue")
      .update({
        kie_task_id: taskIds[0] ?? null,
        kie_task_ids: taskIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (taskError) throw new Error(taskError.message);
  }

  revalidatePath("/admin/content-queue");
}

export async function getContentQueueDownloadUrl(id: string, imageIndex: number) {
  const supabase = await requireAdmin();
  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("image_paths")
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Post not found");

  const paths = filledImagePaths(row.image_paths);
  const path = paths[imageIndex];
  if (!path) throw new Error("Image not found");

  const { data, error } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrl(path, CONTENT_QUEUE_SIGNED_TTL_SECONDS);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create download link");
  }
  return data.signedUrl;
}

export async function revertContentQueueItem(id: string) {
  const supabase = await requireAdmin();
  const { error: deleteBankError } = await supabase
    .from("content_bank_items")
    .delete()
    .eq("source_queue_id", id);
  if (deleteBankError) throw new Error(deleteBankError.message);

  const { error } = await supabase
    .from("content_queue")
    .update({
      status: "pending",
      approved_at: null,
      denied_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateQueueAndBank();
}
