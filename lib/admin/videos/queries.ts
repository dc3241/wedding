import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSegments } from "./script";
import { VIDEO_BUCKET, type VideoFootage, type VideoPost } from "./types";

async function sign(supabase: SupabaseClient, paths: (string | null)[], seconds = 3600): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await supabase.storage.from(VIDEO_BUCKET).createSignedUrls(unique, seconds);
  for (const s of data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

export async function getVideoPageData(supabase: SupabaseClient) {
  const [ideasRes, scriptsRes, footageRes] = await Promise.all([
    supabase.from("video_posts").select("*").eq("stage", "idea").order("created_at", { ascending: true }).limit(40),
    supabase.from("video_posts").select("*").eq("stage", "scripted").order("updated_at", { ascending: false }).limit(60),
    supabase.from("video_footage").select("*").order("created_at", { ascending: false }).limit(120),
  ]);

  const scripts = ((scriptsRes.data ?? []) as VideoPost[]).map((p) => ({ ...p, script: normalizeSegments(p.script) }));
  const footage = (footageRes.data ?? []) as VideoFootage[];
  const urls = await sign(supabase, [...scripts.flatMap((p) => [p.vo_path, p.video_path]), ...footage.map((f) => f.path)]);

  const withUrls = scripts.map((p) => ({
    ...p,
    vo_url: p.vo_path ? (urls.get(p.vo_path) ?? null) : null,
    video_url: p.video_path ? (urls.get(p.video_path) ?? null) : null,
  }));

  return {
    ideas: (ideasRes.data ?? []) as VideoPost[],
    queue: withUrls.filter((p) => p.render_status !== "done"),
    finished: withUrls.filter((p) => p.render_status === "done"),
    footage: footage.map((f) => ({ ...f, url: urls.get(f.path) ?? null })),
  };
}
