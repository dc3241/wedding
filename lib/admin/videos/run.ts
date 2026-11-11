import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COOLDOWN_BATCHES,
  planSlots,
  type HistoryPost,
} from "@/lib/admin/slideshows/logic";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { synthesizeFirstLookVoice } from "./elevenlabs";
import {
  generateVideoIdeas,
  generateVideoScript,
  type FootageBrief,
  type VideoContext,
} from "./plan";
import {
  alignSegments,
  buildTimeline,
  footageNeeds,
  normalizeSegments,
  VO_SPEED,
  voiceText,
  type Segment,
  type VoiceAlignment,
} from "./script";
import { VIDEO_BUCKET, type VideoFootage, type VideoPost } from "./types";

async function loadContext(supabase: SupabaseClient): Promise<VideoContext> {
  const [titles, direction] = await Promise.all([
    supabase.from("video_posts").select("title").order("created_at", { ascending: false }).limit(60),
    supabase.from("slideshow_direction").select("body").eq("active", true).order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    recentTitles: (titles.data ?? []).map((r) => String(r.title)),
    direction: (direction.data ?? []).map((r) => String(r.body)),
  };
}

async function loadHistory(supabase: SupabaseClient): Promise<HistoryPost[]> {
  const { data, error } = await supabase
    .from("video_posts")
    .select("idea_batch_id, angle_key, feature, created_at")
    .not("idea_batch_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const order: string[] = [];
  for (const row of data ?? []) {
    const id = String(row.idea_batch_id);
    if (!order.includes(id)) order.push(id);
  }
  const recent = order.slice(0, COOLDOWN_BATCHES);
  return (data ?? []).flatMap((row) => {
    const idx = recent.indexOf(String(row.idea_batch_id));
    return idx === -1 ? [] : [{ angle_key: String(row.angle_key), feature: String(row.feature), batchesAgo: idx }];
  });
}

/** 10 ideas (half tip, half engagement by default). Older unpicked ideas expire. */
export async function generateIdeas(count = 10, createdBy: "manual" | "cron" = "manual"): Promise<{ batchId: string; produced: number }> {
  const supabase = createServiceRoleClient();
  const [history, ctx] = await Promise.all([loadHistory(supabase), loadContext(supabase)]);
  const slots = planSlots({ count, engagementShare: 0.5, history, scored: [] });
  const ideas = await generateVideoIdeas(slots, ctx);
  if (!ideas.length) throw new Error("No ideas came back. Try again.");

  const batchId = randomUUID();
  await supabase
    .from("video_posts")
    .update({ stage: "expired", updated_at: new Date().toISOString() })
    .eq("stage", "idea");
  const rows = ideas.map((i) => ({
    idea_batch_id: batchId,
    kind: i.slot.kind,
    mechanic: i.slot.mechanic,
    feature: i.slot.feature,
    angle_key: i.slot.angle_key,
    title: i.title,
    hook: i.hook,
    concept: i.concept,
    stage: "idea",
    utm_campaign: `${i.slot.mechanic}-${i.slot.feature}-video`.replace(/_/g, "-"),
    created_by: createdBy,
  }));
  const { error } = await supabase.from("video_posts").insert(rows);
  if (error) throw new Error(error.message);
  return { batchId, produced: rows.length };
}

async function loadLibrary(supabase: SupabaseClient): Promise<FootageBrief[]> {
  const { data } = await supabase
    .from("video_footage")
    .select("id, title, description, feature, media_type, duration_sec")
    .order("created_at", { ascending: false })
    .limit(80);
  return (data ?? []) as FootageBrief[];
}

async function mapPool<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

export type ScriptOutcome = { id: string; ok: boolean; issues?: string[] };

/** Write the script, caption and footage plan for each chosen idea. */
export async function writeScripts(ids: string[]): Promise<ScriptOutcome[]> {
  const supabase = createServiceRoleClient();
  const [ctx, library] = await Promise.all([loadContext(supabase), loadLibrary(supabase)]);
  const { data } = await supabase.from("video_posts").select("*").in("id", ids).in("stage", ["idea", "scripted"]);
  const posts = (data ?? []) as VideoPost[];
  return mapPool(posts, 3, async (post): Promise<ScriptOutcome> => {
    const out = await generateVideoScript(post, ctx, library);
    if (!out.ok) return { id: post.id, ok: false, issues: out.issues };
    const { error } = await supabase
      .from("video_posts")
      .update({
        stage: "scripted",
        script: out.script.segments,
        caption: out.script.caption,
        pinned_comment: out.script.pinned_comment,
        // a rewritten script invalidates any earlier voiceover
        vo_path: null,
        vo_duration: null,
        vo_words: null,
        vo_text: null,
        render_status: "idle",
        render_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    return error ? { id: post.id, ok: false, issues: [error.message] } : { id: post.id, ok: true };
  });
}

/** One ElevenLabs take on First Look Voice. Stores the mp3 and word timings. */
export async function createVoiceover(id: string): Promise<{ duration: number }> {
  const supabase = createServiceRoleClient();
  const { data: post, error } = await supabase.from("video_posts").select("id, script").eq("id", id).maybeSingle();
  if (error || !post) throw new Error("Video not found.");
  const segments = normalizeSegments(post.script);
  const text = voiceText(segments);
  if (!text) throw new Error("The script has no spoken text.");

  const { audio, alignment } = await synthesizeFirstLookVoice(text);
  const aligned = alignSegments(segments, alignment);
  const path = `voiceovers/${id}/${Date.now().toString(36)}.mp3`;
  const up = await supabase.storage.from(VIDEO_BUCKET).upload(path, audio, { contentType: "audio/mpeg", upsert: false });
  if (up.error) throw new Error(up.error.message);

  const { error: updateError } = await supabase
    .from("video_posts")
    .update({
      vo_path: path,
      vo_duration: aligned.duration,
      vo_words: aligned,
      vo_text: text,
      render_status: "idle",
      render_error: null,
      video_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);
  return { duration: aligned.duration };
}

export type Readiness = { ready: boolean; reasons: string[] };

export function renderReadiness(post: Pick<VideoPost, "script" | "vo_path" | "vo_text" | "render_status">): Readiness {
  const reasons: string[] = [];
  const segments = normalizeSegments(post.script);
  if (!post.vo_path) reasons.push("Create the voiceover first.");
  else if (post.vo_text !== voiceText(segments)) reasons.push("The spoken text changed since the voiceover. Create it again.");
  const missing = footageNeeds(segments).filter((n) => !n.satisfied);
  if (missing.length) reasons.push(`${missing.length} screen recording${missing.length > 1 ? "s" : ""} still needed.`);
  if (post.render_status === "rendering") reasons.push("Already rendering.");
  return { ready: reasons.length === 0, reasons };
}

const SIGN_SECONDS = 6 * 60 * 60;

function extOf(path: string): string {
  return path.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
}

/** Builds the render job, stores it, and triggers the GitHub Actions workflow. */
export async function startRender(id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("video_posts").select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Video not found.");
  const post = data as VideoPost;
  const gate = renderReadiness(post);
  if (!gate.ready) throw new Error(gate.reasons.join(" "));

  const dispatchToken = process.env.GITHUB_DISPATCH_TOKEN;
  if (!dispatchToken) throw new Error("GITHUB_DISPATCH_TOKEN is not configured.");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("Supabase public configuration is missing.");

  const segments = normalizeSegments(post.script);
  const aligned = post.vo_words as VoiceAlignment;
  const timeline = buildTimeline(segments, aligned, { speed: VO_SPEED });

  // footage: every footage segment points at a library clip
  const clipIds = segments.flatMap((s) => (s.visual.type === "footage" && s.visual.clip_id ? [s.visual.clip_id] : []));
  const { data: clips } = clipIds.length
    ? await supabase.from("video_footage").select("id, path, media_type").in("id", clipIds)
    : { data: [] as Pick<VideoFootage, "id" | "path" | "media_type">[] };
  const clipById = new Map((clips ?? []).map((c) => [String(c.id), c as Pick<VideoFootage, "id" | "path" | "media_type">]));

  const assets: Record<string, { url: string; mediaType: string; ext: string }> = {};
  const beats = [];
  for (const beat of timeline.beats) {
    if (beat.visual.type !== "footage") {
      beats.push(beat);
      continue;
    }
    const clip = beat.visual.clip_id ? clipById.get(beat.visual.clip_id) : null;
    if (!clip) throw new Error(`The recording for "${beat.visual.need || beat.id}" is missing from the library.`);
    const signed = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(clip.path, SIGN_SECONDS);
    if (signed.error || !signed.data) throw new Error(signed.error?.message ?? "Could not sign footage.");
    const key = `f-${beat.id}`.replace(/[^a-zA-Z0-9_-]/g, "");
    assets[key] = { url: signed.data.signedUrl, mediaType: clip.media_type, ext: extOf(clip.path) };
    beats.push({ ...beat, visual: { ...beat.visual, assetKey: key } });
  }

  const voSigned = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(post.vo_path as string, SIGN_SECONDS);
  if (voSigned.error || !voSigned.data) throw new Error(voSigned.error?.message ?? "Could not sign voiceover.");

  const outPath = `renders/${id}/final.mp4`;
  const uploadToken = await supabase.storage.from(VIDEO_BUCKET).createSignedUploadUrl(outPath, { upsert: true });
  if (uploadToken.error || !uploadToken.data) throw new Error(uploadToken.error?.message ?? "Could not prepare the upload.");

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://usefirstlook.app").replace(/\/$/, "");
  const token = randomUUID();
  const job = {
    post_id: id,
    token,
    callback_url: `${siteUrl}/api/video-render/callback`,
    speed: VO_SPEED,
    vo_url: voSigned.data.signedUrl,
    supabase_url: supabaseUrl,
    anon_key: anonKey,
    bucket: VIDEO_BUCKET,
    upload: { path: outPath, token: uploadToken.data.token },
    assets,
    pauses: timeline.pauses,
    spec: { durationSec: timeline.duration, beats },
  };

  const jobPath = `jobs/${id}/${Date.now().toString(36)}.json`;
  const jobUp = await supabase.storage.from(VIDEO_BUCKET).upload(jobPath, Buffer.from(JSON.stringify(job)), { contentType: "application/json", upsert: false });
  if (jobUp.error) throw new Error(jobUp.error.message);
  const jobUrl = await supabase.storage.from(VIDEO_BUCKET).createSignedUrl(jobPath, SIGN_SECONDS);
  if (jobUrl.error || !jobUrl.data) throw new Error(jobUrl.error?.message ?? "Could not sign the job.");

  await supabase
    .from("video_posts")
    .update({ render_status: "rendering", render_token: token, render_error: null, video_path: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  const repo = process.env.GITHUB_REPO?.trim() || "dc3241/wedding";
  const ref = process.env.GITHUB_REF_NAME?.trim() || "master";
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/render-video.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dispatchToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref, inputs: { job_url: jobUrl.data.signedUrl } }),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    await supabase
      .from("video_posts")
      .update({ render_status: "failed", render_error: `Could not start the render (GitHub ${res.status}). ${detail}`, updated_at: new Date().toISOString() })
      .eq("id", id);
    throw new Error(`Could not start the render (GitHub ${res.status}).`);
  }
}

export type { Segment };
