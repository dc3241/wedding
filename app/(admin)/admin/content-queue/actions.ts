"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
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

export async function approveContentQueueItem(id: string) {
  const supabase = await requireAdmin();
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
  revalidatePath("/admin/content-queue");
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
 * Re-kick KIE for this row. Saves the (possibly edited) prompt, stores a
 * new kie_task_id, sets status back to pending. Does not touch image_paths
 * — the webhook overwrites those when the new task completes.
 */
export async function regenerateContentQueueItem(id: string, prompt: string) {
  const supabase = await requireAdmin();
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Prompt is required.");

  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("id, platform")
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Post not found");

  const { error: promptError } = await supabase
    .from("content_queue")
    .update({
      prompt: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (promptError) throw new Error(promptError.message);

  const taskId = await requestGeneration({
    platform: row.platform,
    prompt: trimmed,
  });

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("content_queue")
    .update({
      kie_task_id: taskId,
      status: "pending",
      approved_at: null,
      denied_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
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

  const paths = (row.image_paths ?? []) as string[];
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
  revalidatePath("/admin/content-queue");
}
