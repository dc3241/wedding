"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  applyIdeaTargetPatch,
  isContentPostFormat,
  type IdeaTargetFields,
} from "@/lib/admin/content-formats";
import {
  isContentQueuePlatform,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import type { PostResultInput } from "@/lib/admin/post-results";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

export async function rateIdea(id: string, rating: "up" | "down" | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").update({ rating }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export async function setIdeaComment(id: string, comment: string | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").update({ comment }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export type IdeaTargetPatch = Partial<IdeaTargetFields>;

function isQueuePlatform(value: unknown): value is ContentQueuePlatform {
  return isContentQueuePlatform(value);
}

function isAudience(value: unknown): value is AudienceGroup {
  return value === "couples" || value === "planner";
}

export async function setIdeaTarget(id: string, patch: IdeaTargetPatch) {
  const supabase = await requireAdmin();
  const { data: current, error: loadError } = await supabase
    .from("ideation_items")
    .select("platform, format, audience_group, carousel_slides")
    .eq("id", id)
    .single();
  if (loadError || !current) throw new Error(loadError?.message ?? "Idea not found");

  const next = applyIdeaTargetPatch(
    {
      platform: isQueuePlatform(current.platform) ? current.platform : null,
      format: isContentPostFormat(current.format) ? current.format : null,
      audience_group: isAudience(current.audience_group) ? current.audience_group : null,
      carousel_slides: current.carousel_slides ?? null,
    },
    patch,
  );

  const { error } = await supabase
    .from("ideation_items")
    .update(next)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export async function deleteIdea(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

function cleanCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).replace(/[,\s]/g, ""));
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.min(Math.round(num), 2_000_000_000);
}

/** Save (or update) the numbers logged for one approved post. */
export async function savePostResults(queueId: string, input: PostResultInput) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error: postError } = await supabase
    .from("content_queue")
    .select("id, platform")
    .eq("id", queueId)
    .single();
  if (postError || !post) throw new Error("Post not found");

  const url = input.post_url?.trim() || null;
  if (url && !/^https?:\/\//i.test(url)) throw new Error("The post link should start with https://");

  const row = {
    queue_id: queueId,
    platform: post.platform as string,
    post_url: url,
    views: cleanCount(input.views),
    likes: cleanCount(input.likes),
    comments: cleanCount(input.comments),
    shares: cleanCount(input.shares),
    saves: cleanCount(input.saves),
    notable_comments: input.notable_comments?.trim().slice(0, 2000) || null,
    logged_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("post_results").upsert(row, { onConflict: "queue_id" });
  if (error) {
    if (/post_results/.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      throw new Error("Results table is missing. Run the post_results migration in Supabase.");
    }
    throw new Error(error.message);
  }
  revalidatePath("/admin/ideation");
}
