import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import {
  DEFAULT_SLIDESHOW_SETTINGS,
  type SlideshowDirection,
  type SlideshowPost,
  type SlideshowResultRow,
  type SlideshowSettings,
  type SlideshowSummary,
} from "./types";

const POST_COLS =
  "id, batch_id, origin, kind, mechanic, feature, angle_key, topic, title, caption, pinned_comment, hook, utm_campaign, custom_brief, slide_specs, image_paths, status, selected_at, downloaded_at, posted_on, created_at";

type Row = Omit<SlideshowPost, "result" | "thumb_url"> & {
  slideshow_results?: SlideshowResultRow | SlideshowResultRow[] | null;
};

async function withThumbs(supabase: SupabaseClient, rows: Row[]): Promise<SlideshowPost[]> {
  const firsts = rows.map((r) => r.image_paths?.[0]).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (firsts.length) {
    const { data } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).createSignedUrls(firsts, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }
  return rows.map((r) => {
    const { slideshow_results, ...rest } = r;
    const result = Array.isArray(slideshow_results) ? (slideshow_results[0] ?? null) : (slideshow_results ?? null);
    return { ...rest, result, thumb_url: signed.get(r.image_paths?.[0] ?? "") ?? null };
  });
}

export async function getSlideshowPageData(supabase: SupabaseClient) {
  const [settingsRes, candidatesRes, selectedRes, summaryRes, directionRes, batchRes] = await Promise.all([
    supabase.from("slideshow_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("slideshow_posts").select(POST_COLS).eq("status", "candidate").order("created_at", { ascending: false }).limit(60),
    supabase
      .from("slideshow_posts")
      .select(`${POST_COLS}, slideshow_results(post_id, post_url, views, likes, comments, shares, saves, link_clicks, signups, notes, updated_at)`)
      .eq("status", "selected")
      .order("downloaded_at", { ascending: false })
      .limit(80),
    supabase.from("slideshow_summaries").select("id, week_start, body, created_at").order("week_start", { ascending: false }).limit(4),
    supabase.from("slideshow_direction").select("id, summary_id, source, body, active, created_at").eq("active", true).order("created_at", { ascending: false }),
    supabase.from("slideshow_batches").select("id, batch_date, status, requested, produced, notes").order("created_at", { ascending: false }).limit(1),
  ]);

  const settings: SlideshowSettings = settingsRes.data
    ? ({ ...settingsRes.data, engagement_share: Number(settingsRes.data.engagement_share) } as SlideshowSettings)
    : DEFAULT_SLIDESHOW_SETTINGS;

  const [candidates, selected] = await Promise.all([
    withThumbs(supabase, (candidatesRes.data ?? []) as unknown as Row[]),
    withThumbs(supabase, (selectedRes.data ?? []) as unknown as Row[]),
  ]);

  return {
    settings,
    candidates,
    selected,
    summaries: (summaryRes.data ?? []) as SlideshowSummary[],
    directions: (directionRes.data ?? []) as SlideshowDirection[],
    latestBatch: (batchRes.data?.[0] ?? null) as {
      id: string;
      batch_date: string;
      status: string;
      requested: number;
      produced: number;
      notes: string | null;
    } | null,
  };
}
