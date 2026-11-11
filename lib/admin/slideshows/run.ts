import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { renderSlidePngs } from "@/lib/admin/content-queue/render-slides";
import { adminToday } from "@/lib/admin/today";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  COOLDOWN_BATCHES,
  batchesAgoMap,
  describePerformance,
  planSlots,
  scorePosts,
  type HistoryPost,
  type PostWithResult,
  type ResultLite,
  type ScoredPost,
} from "./logic";
import {
  generateCustomPost,
  generatePost,
  type GeneratedPost,
  type GenerationContext,
} from "./plan";
import { DEFAULT_SLIDESHOW_SETTINGS, type SlideshowSettings } from "./types";

export async function loadSettings(supabase: SupabaseClient): Promise<SlideshowSettings> {
  const { data } = await supabase
    .from("slideshow_settings")
    .select("batch_weekday, batch_size, engagement_share, summary_weekday, auto_generate, last_batch_on, last_summary_on")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULT_SLIDESHOW_SETTINGS;
  return {
    ...data,
    engagement_share: Number(data.engagement_share),
  } as SlideshowSettings;
}

type PostWithResultRow = {
  id: string;
  kind: string;
  mechanic: string;
  feature: string;
  angle_key: string;
  title: string;
  slideshow_results: ResultLite | ResultLite[] | null;
};

/** Every post that has logged results, scored. Unlogged and zero-view posts drop out. */
export async function loadScoredPosts(supabase: SupabaseClient): Promise<ScoredPost[]> {
  const { data, error } = await supabase
    .from("slideshow_posts")
    .select(
      "id, kind, mechanic, feature, angle_key, title, slideshow_results(views, likes, comments, shares, saves, link_clicks, signups)",
    )
    .eq("status", "selected")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as PostWithResultRow[];
  const posts: PostWithResult[] = rows.map((row) => {
    const r = Array.isArray(row.slideshow_results) ? (row.slideshow_results[0] ?? null) : row.slideshow_results;
    return { id: row.id, kind: row.kind, mechanic: row.mechanic, feature: row.feature, angle_key: row.angle_key, title: row.title, result: r };
  });
  return scorePosts(posts);
}

export async function loadGenerationContext(
  supabase: SupabaseClient,
  scored: ScoredPost[],
): Promise<GenerationContext> {
  const [titles, direction] = await Promise.all([
    supabase.from("slideshow_posts").select("title").order("created_at", { ascending: false }).limit(60),
    supabase.from("slideshow_direction").select("body").eq("active", true).order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    recentTitles: (titles.data ?? []).map((r) => String(r.title)),
    performanceNotes: describePerformance(scored),
    direction: (direction.data ?? []).map((r) => String(r.body)),
  };
}

/** Angle keys from the last COOLDOWN_BATCHES batches, tagged with how many batches ago. */
async function loadHistory(supabase: SupabaseClient): Promise<HistoryPost[]> {
  const { data: batches, error } = await supabase
    .from("slideshow_batches")
    .select("id")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(COOLDOWN_BATCHES);
  if (error) throw new Error(error.message);
  const ids = (batches ?? []).map((b) => String(b.id));
  if (ids.length === 0) return [];
  const { data: posts, error: postsError } = await supabase
    .from("slideshow_posts")
    .select("batch_id, angle_key, feature")
    .in("batch_id", ids);
  if (postsError) throw new Error(postsError.message);
  const ago = batchesAgoMap(ids);
  return (posts ?? []).flatMap((p) => {
    const batchesAgo = ago.get(String(p.batch_id));
    return batchesAgo === undefined ? [] : [{ angle_key: String(p.angle_key), feature: String(p.feature), batchesAgo }];
  });
}

async function mapPool<T, R>(items: readonly T[], size: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

/** Renders the slides, uploads them, and inserts the post as a candidate. Returns the post id. */
async function persistPost(
  supabase: SupabaseClient,
  post: GeneratedPost,
  where: { batchId: string | null; origin: "batch" | "custom" },
): Promise<string> {
  const id = randomUUID();
  const { pngs } = await renderSlidePngs(post.slide_specs);
  const folder = `slideshows/${where.batchId ?? "custom"}/${id}`;
  const stamp = Date.now().toString(36);
  const paths: string[] = [];
  for (let i = 0; i < pngs.length; i += 1) {
    const objectPath = `${folder}/${stamp}-${i}.png`;
    const { error } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).upload(objectPath, pngs[i] as Buffer, {
      contentType: "image/png",
      cacheControl: "0",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    paths.push(objectPath);
  }
  const { error } = await supabase.from("slideshow_posts").insert({
    id,
    batch_id: where.batchId,
    origin: where.origin,
    kind: post.kind,
    mechanic: post.mechanic,
    feature: post.feature,
    angle_key: post.angle_key,
    topic: post.topic,
    title: post.title,
    caption: post.caption,
    pinned_comment: post.pinned_comment,
    hook: post.hook,
    utm_campaign: post.utm_campaign,
    custom_brief: post.custom_brief,
    slide_specs: post.slide_specs,
    image_paths: paths,
    status: "candidate",
  });
  if (error) throw new Error(error.message);
  return id;
}

export type BatchResult = { batchId: string; requested: number; produced: number; errors: string[] };

/**
 * One batch: plan the angles (cooldown + performance weights), write each post,
 * render it, and store it as a candidate. Unreviewed candidates from earlier
 * batches are expired first so the Batch tab only ever shows the newest batch
 * (plus custom posts). Expired posts still count toward the rotation history.
 */
export async function generateBatch(createdBy: "cron" | "manual"): Promise<BatchResult> {
  const supabase = createServiceRoleClient();
  const settings = await loadSettings(supabase);
  const today = adminToday();

  const [history, scored] = await Promise.all([loadHistory(supabase), loadScoredPosts(supabase)]);
  const ctx = await loadGenerationContext(supabase, scored);
  const slots = planSlots({
    count: settings.batch_size,
    engagementShare: settings.engagement_share,
    history,
    scored,
  });

  const { data: batch, error: batchError } = await supabase
    .from("slideshow_batches")
    .insert({ batch_date: today, status: "generating", requested: slots.length, created_by: createdBy })
    .select("id")
    .single();
  if (batchError || !batch) throw new Error(batchError?.message ?? "Could not create the batch.");
  const batchId = String(batch.id);

  await supabase
    .from("slideshow_posts")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "candidate")
    .eq("origin", "batch")
    .neq("batch_id", batchId);

  const errors: string[] = [];
  const titlesSoFar = [...ctx.recentTitles];
  let produced = 0;
  await mapPool(slots, 4, async (slot) => {
    try {
      const out = await generatePost(slot, { ...ctx, recentTitles: titlesSoFar });
      if (!out.ok) {
        errors.push(`${slot.angle_key}: ${out.issues.join("; ")}`);
        return;
      }
      titlesSoFar.unshift(out.post.title);
      await persistPost(supabase, out.post, { batchId, origin: "batch" });
      produced += 1;
    } catch (err) {
      errors.push(`${slot.angle_key}: ${err instanceof Error ? err.message : "failed"}`);
    }
  });

  await supabase
    .from("slideshow_batches")
    .update({
      status: produced > 0 ? "ready" : "failed",
      produced,
      notes: errors.length ? errors.join("\n").slice(0, 2000) : null,
    })
    .eq("id", batchId);
  await supabase
    .from("slideshow_settings")
    .update({ last_batch_on: today, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return { batchId, requested: slots.length, produced, errors };
}

/** A one-off post from a plain-language brief. Lands in the Batch tab as a custom candidate. */
export async function produceCustomPost(brief: string): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceRoleClient();
  const scored = await loadScoredPosts(supabase);
  const ctx = await loadGenerationContext(supabase, scored);
  const out = await generateCustomPost(brief, ctx);
  if (!out.ok) return { error: out.issues.join("; ") || "Could not write that post." };
  const id = await persistPost(supabase, out.post, { batchId: null, origin: "custom" });
  return { id };
}
