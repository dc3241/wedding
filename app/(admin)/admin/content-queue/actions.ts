"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  filledImagePaths,
  formatNeedsImages,
  imagesReadyForQueue,
  isContentPostFormat,
} from "@/lib/admin/content-formats";
import { renderAndStoreSlides } from "@/lib/admin/content-queue/render-slides";
import { selectSlideSpecs, shuffleSlideSpecs } from "@/lib/admin/content-queue/select-slide";
import {
  parseStoredSpecs,
  statementFragment,
  stylesFromSpecs,
  type SlideSpec,
} from "@/lib/admin/content-queue/slide-spec";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { ContentType } from "@/lib/admin/platforms";
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
    // Queue row is deleted next; don't keep a dangling FK.
    source_queue_id: null as string | null,
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

  // Bank is the home for approved posts — drop the queue row so the
  // review inbox stays pending/denied only.
  const { error } = await supabase.from("content_queue").delete().eq("id", id);
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
 * Re-render the stored slide specs. A single-slide prompt edit updates that
 * slide's headline (first line) and support (the rest). UGC and text skip
 * the renderer.
 */
export async function regenerateContentQueueItem(id: string, prompt: string) {
  const supabase = await requireAdmin();
  const trimmed = prompt.trim();

  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("id, platform, format, content_type, carousel_slides, slide_specs, week_of, prompt")
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

  let specs = applyPromptEdit(parseStoredSpecs(row.slide_specs), trimmed);
  if (specs.length === 0) {
    const contentType = isContentType(row.content_type) ? row.content_type : "C";
    const platform = row.platform as ContentQueuePlatform;
    specs = selectSlideSpecs({
      platform,
      contentType,
      fragments: [statementFragment(trimmed || row.prompt || "First Look")],
    });
  }
  if (specs.length === 0) throw new Error("Nothing to render.");

  const headlines = specs.map((spec) =>
    spec.support ? `${spec.headline}\n${spec.support}` : spec.headline,
  );
  const { error: promptError } = await supabase
    .from("content_queue")
    .update({
      prompt: headlines[0] ?? trimmed,
      slide_prompts: headlines,
      slide_specs: specs,
      image_paths: Array.from({ length: specs.length }, () => ""),
      status: "pending",
      approved_at: null,
      denied_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (promptError) throw new Error(promptError.message);

  await renderAndStoreSlides(supabase, { id: row.id, week_of: row.week_of }, specs);
  revalidatePath("/admin/content-queue");
}

/** Keep the copy. Pick a different theme, and a different layout when one fits. */
export async function shuffleContentQueueItem(id: string) {
  const supabase = await requireAdmin();
  const { data: row, error: rowError } = await supabase
    .from("content_queue")
    .select("id, platform, content_type, format, slide_specs, week_of")
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Post not found");
  const format = isContentPostFormat(row.format) ? row.format : null;
  if (!formatNeedsImages(format)) throw new Error("This post has no image to shuffle.");

  const current = parseStoredSpecs(row.slide_specs);
  if (current.length === 0) throw new Error("Nothing to shuffle yet.");

  const platform = row.platform as ContentQueuePlatform;
  const { data: recentRows, error: recentError } = await supabase
    .from("content_queue")
    .select("slide_specs")
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(6);
  if (recentError) throw new Error(recentError.message);
  const recent = (recentRows ?? []).flatMap((item) => stylesFromSpecs(item.slide_specs));
  const contentType = isContentType(row.content_type) ? row.content_type : "C";
  const specs = shuffleSlideSpecs(current, recent, contentType, platform);
  const headlines = specs.map((spec) =>
    spec.support ? `${spec.headline}\n${spec.support}` : spec.headline,
  );
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("content_queue")
    .update({
      prompt: headlines[0] ?? "",
      slide_prompts: headlines,
      slide_specs: specs,
      image_paths: Array.from({ length: specs.length }, () => ""),
      status: "pending",
      approved_at: null,
      denied_at: null,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await renderAndStoreSlides(supabase, { id: row.id, week_of: row.week_of }, specs);
  revalidatePath("/admin/content-queue");
}

function isContentType(value: unknown): value is ContentType {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function applyPromptEdit(specs: SlideSpec[], prompt: string): SlideSpec[] {
  if (specs.length !== 1 || !prompt.trim()) return specs;
  const [headline, ...rest] = prompt.split("\n");
  const nextHeadline = headline?.trim();
  if (!nextHeadline) return specs;
  const support = rest.join(" ").trim();
  return [{ ...specs[0]!, headline: nextHeadline, ...(support ? { support } : { support: undefined }) }];
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
