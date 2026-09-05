import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
import type {
  AdminAutomationPrompt,
  AdminAutomationRun,
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
  const rows = (data ?? []) as Omit<ContentBankItem, "image_urls">[];
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      image_urls: await signQueueImagePaths(
        supabase,
        (row.image_paths ?? []).filter((p) => p.trim().length > 0),
      ),
    })),
  );
}

export async function getAutomationPrompts(
  supabase: SupabaseClient,
): Promise<AdminAutomationPrompt[]> {
  const { data } = await supabase
    .from("admin_automation_prompts")
    .select("id, name, description, prompt_template, is_manual_trigger, audience_group")
    .order("name", { ascending: true });
  return (data ?? []) as AdminAutomationPrompt[];
}

export async function getRecentAutomationRuns(
  supabase: SupabaseClient,
  opts: { limit?: number; promptIds?: string[] } = {},
): Promise<AdminAutomationRun[]> {
  const limit = opts.limit ?? 20;
  if (opts.promptIds && opts.promptIds.length === 0) {
    return [];
  }
  let query = supabase
    .from("admin_automation_runs")
    .select(
      "id, prompt_id, triggered_by, input_text, output_text, status, error_message, saved_to_bank, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.promptIds && opts.promptIds.length > 0) {
    query = query.in("prompt_id", opts.promptIds);
  }
  const { data } = await query;
  return (data ?? []) as AdminAutomationRun[];
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
    .select("id, idea_text, requested_by, rating, comment, platform, format, audience_group, carousel_slides, used_at, created_at")
    .is("used_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as IdeationItem[];
}

const QUEUE_SELECT =
  "id, platform, pillar, content_type, prompt, image_paths, caption, status, week_of, kie_task_id, kie_task_ids, format, audience_group, carousel_slides, generated_by, approved_at, denied_at, created_at, updated_at";

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
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as QueueRow[];
  const items = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      kie_task_ids: row.kie_task_ids ?? [],
      image_urls: await signQueueImagePaths(
        supabase,
        (row.image_paths ?? []).filter((p) => p.trim().length > 0),
      ),
    })),
  );
  return { weekOf: resolvedWeek, items };
}
