import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
import type {
  ContentBankItem,
  ContentQueueItem,
  IdeationItem,
  MediaAsset,
  ScheduleDay,
  SchedulePerformance,
  ScheduleWeek,
  WeekWithDetail,
} from "@/lib/admin/types";

/** All weeks, each with its days + performance row, oldest first. */
export async function getScheduleWeeks(
  supabase: SupabaseClient,
): Promise<WeekWithDetail[]> {
  const [{ data: weeks }, { data: days }, { data: perf }] = await Promise.all([
    supabase
      .from("schedule_weeks")
      .select("id, label, start_date, end_date")
      .order("start_date", { ascending: true }),
    supabase
      .from("schedule_days")
      .select("id, week_id, date, platforms, notes_couples, notes_planner")
      .order("date", { ascending: true }),
    supabase
      .from("schedule_performance")
      .select("id, week_id, views, follower_growth, dms, signups, notes"),
  ]);

  const weekRows = (weeks ?? []) as ScheduleWeek[];
  const dayRows = (days ?? []) as ScheduleDay[];
  const perfRows = (perf ?? []) as SchedulePerformance[];

  return weekRows.map((week) => ({
    ...week,
    days: dayRows.filter((d) => d.week_id === week.id),
    performance: perfRows.find((p) => p.week_id === week.id) ?? null,
  }));
}

/** The week containing `todayIso`, else the closest week by start_date. */
export function pickCurrentWeek(
  weeks: WeekWithDetail[],
  todayIso: string,
): WeekWithDetail | null {
  if (weeks.length === 0) return null;
  const containing = weeks.find(
    (w) => w.start_date <= todayIso && todayIso <= w.end_date,
  );
  if (containing) return containing;

  const past = [...weeks]
    .filter((w) => w.end_date < todayIso)
    .sort((a, b) => (a.end_date < b.end_date ? 1 : -1));
  if (past.length > 0) return past[0];

  return [...weeks].sort((a, b) => (a.start_date < b.start_date ? -1 : 1))[0];
}

export async function getContentBank(
  supabase: SupabaseClient,
): Promise<ContentBankItem[]> {
  const { data } = await supabase
    .from("content_bank_items")
    .select(
      "id, platform, idea, type, format, title, body, notes, audience_group, source_queue_id, image_paths, created_at",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as ContentBankItem[];
}

export async function getMediaAssets(
  supabase: SupabaseClient,
): Promise<MediaAsset[]> {
  const { data } = await supabase
    .from("media_assets")
    .select(
      "id, filename, storage_path, uploaded_by, file_size, content_type, status, notes, created_at",
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as MediaAsset[];
}

export async function getIdeationItems(
  supabase: SupabaseClient,
): Promise<IdeationItem[]> {
  const { data } = await supabase
    .from("ideation_items")
    .select("id, idea_text, requested_by, rating, comment, platform, format, audience_group, carousel_slides, used_at, created_at, lane, intent, post_style, topic_key, slot_date, week_start")
    .is("used_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as IdeationItem[];
}

/** Unused ideas from the most recent "Generate 10 ideas" click. */
export async function getLatestIdeaBatch(
  supabase: SupabaseClient,
): Promise<IdeationItem[]> {
  const { data: latest, error: latestError } = await supabase
    .from("ideation_items")
    .select("batch_id")
    .not("batch_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Migration not applied yet, or nothing generated: show an empty batch.
  if (latestError || !latest?.batch_id) return [];

  const { data } = await supabase
    .from("ideation_items")
    .select("id, idea_text, requested_by, rating, comment, platform, format, audience_group, carousel_slides, used_at, created_at, lane, intent, post_style, topic_key, slot_date, week_start")
    .eq("batch_id", latest.batch_id)
    .is("used_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as IdeationItem[];
}

const QUEUE_SELECT = "*";

type QueueRow = Omit<ContentQueueItem, "image_urls">;

async function signQueueImagePaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrls(paths, CONTENT_QUEUE_SIGNED_TTL_SECONDS);
  if (error || !data) return [];
  return data
    .filter((row) => row.signedUrl && !row.error)
    .map((row) => row.signedUrl as string);
}

async function hydrateQueueRows(
  supabase: SupabaseClient,
  rows: QueueRow[],
): Promise<ContentQueueItem[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      image_paths: row.image_paths ?? [],
      format: row.format ?? null,
      audience_group: row.audience_group ?? null,
      carousel_slides: row.carousel_slides ?? null,
      post_style: row.post_style ?? null,
      image_urls: await signQueueImagePaths(
        supabase,
        (row.image_paths ?? []).filter((p) => p.trim().length > 0),
      ),
    })),
  );
}

/** Pending and denied posts waiting on Ideation, newest first. */
export async function getReviewPosts(supabase: SupabaseClient): Promise<ContentQueueItem[]> {
  const { data, error } = await supabase
    .from("content_queue")
    .select(QUEUE_SELECT)
    .neq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return hydrateQueueRows(supabase, (data ?? []) as QueueRow[]);
}

/** Most recent week_of by default. Preview URLs are signed server-side. */
export async function getContentQueue(
  supabase: SupabaseClient,
  weekOf?: string,
): Promise<{ weekOf: string | null; items: ContentQueueItem[] }> {
  let resolvedWeek = weekOf ?? null;
  if (!resolvedWeek) {
    const { data: latest } = await supabase
      .from("content_queue")
      .select("week_of")
      .order("week_of", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedWeek = latest?.week_of ?? null;
  }

  if (!resolvedWeek) {
    return { weekOf: null, items: [] };
  }

  const { data, error } = await supabase
    .from("content_queue")
    .select(QUEUE_SELECT)
    .eq("week_of", resolvedWeek)
    .neq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const items = await hydrateQueueRows(supabase, (data ?? []) as QueueRow[]);
  return { weekOf: resolvedWeek, items };
}
