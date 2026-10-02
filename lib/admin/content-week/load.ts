import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatNeedsImages,
  imagesReadyForQueue,
  isContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  CONTENT_LANES,
  isContentLane,
  isSlotIntent,
  nextVideoFeatureKeys,
  postingDates,
  slotsForLane,
  type ContentSlot,
  type IdeaDraft,
} from "@/lib/admin/content-week";
import type { IdeationItem } from "@/lib/admin/types";
import { adminToday } from "@/lib/admin/today";

const IDEA_COLUMNS =
  "id, idea_text, requested_by, rating, comment, platform, format, audience_group, carousel_slides, used_at, created_at, lane, intent, topic_key, slot_date, week_start";

export async function ensureWeekSlots(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<void> {
  const rows = postingDates(weekStart).flatMap((date) =>
    CONTENT_LANES.flatMap((lane) =>
      slotsForLane(lane, date).map((spec) => ({
        week_start: weekStart,
        slot_date: date,
        lane,
        intent: spec.intent,
        position: spec.position,
      })),
    ),
  );

  const { error } = await supabase.from("content_slots").upsert(rows, {
    onConflict: "slot_date,lane,position",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
  await assignVideoFeatures(supabase);
}

/**
 * Stamp unposted video slots from today forward that do not have a tab yet.
 * Earlier slots stay unlabeled, so the cycle starts at Overview on the next video.
 */
async function assignVideoFeatures(supabase: SupabaseClient): Promise<void> {
  const { count, error: countError } = await supabase
    .from("content_slots")
    .select("id", { count: "exact", head: true })
    .eq("lane", "video")
    .not("feature_key", "is", null);
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from("content_slots")
    .select("id")
    .eq("lane", "video")
    .is("feature_key", null)
    .is("posted_at", null)
    .gte("slot_date", adminToday())
    .order("slot_date", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  const pending = data ?? [];
  if (pending.length === 0) return;
  const keys = nextVideoFeatureKeys(count ?? 0, pending.length);
  for (let index = 0; index < pending.length; index++) {
    const { error: updateError } = await supabase
      .from("content_slots")
      .update({ feature_key: keys[index] })
      .eq("id", pending[index]!.id)
      .is("feature_key", null);
    if (updateError) throw new Error(updateError.message);
  }
}

export async function listContentWeekStarts(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("content_slots")
    .select("week_start")
    .order("week_start", { ascending: false });
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.week_start === "string") seen.add(row.week_start);
  }
  return [...seen];
}

function asIdea(row: Record<string, unknown>): IdeationItem | null {
  if (typeof row.id !== "string" || typeof row.idea_text !== "string") return null;
  return row as unknown as IdeationItem;
}

function asSlot(row: Record<string, unknown>): ContentSlot | null {
  if (
    typeof row.id !== "string" ||
    typeof row.week_start !== "string" ||
    typeof row.slot_date !== "string" ||
    !isContentLane(row.lane) ||
    !isSlotIntent(row.intent) ||
    typeof row.position !== "number"
  ) {
    return null;
  }
  return {
    id: row.id,
    week_start: row.week_start,
    slot_date: row.slot_date,
    lane: row.lane,
    intent: row.intent,
    position: row.position,
    idea_id: typeof row.idea_id === "string" ? row.idea_id : null,
    feature_key: typeof row.feature_key === "string" ? row.feature_key : null,
    filmed_at: typeof row.filmed_at === "string" ? row.filmed_at : null,
    posted_at: typeof row.posted_at === "string" ? row.posted_at : null,
    fb_posted_at: typeof row.fb_posted_at === "string" ? row.fb_posted_at : null,
  };
}

export type ContentWeekData = {
  weekStart: string;
  slots: ContentSlot[];
  ideas: IdeationItem[];
  drafts: Record<string, IdeaDraft>;
};

export async function loadContentWeek(
  supabase: SupabaseClient,
  weekStart: string,
): Promise<ContentWeekData> {
  const { data: slotRows, error: slotError } = await supabase
    .from("content_slots")
    .select(
      "id, week_start, slot_date, lane, intent, position, idea_id, feature_key, filmed_at, posted_at, fb_posted_at",
    )
    .eq("week_start", weekStart)
    .order("slot_date", { ascending: true })
    .order("position", { ascending: true });
  if (slotError) throw new Error(slotError.message);

  const slots = (slotRows ?? []).flatMap((row) => {
    const slot = asSlot(row as Record<string, unknown>);
    return slot ? [slot] : [];
  });

  const { data: ideaRows, error: ideaError } = await supabase
    .from("ideation_items")
    .select(IDEA_COLUMNS)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: true });
  if (ideaError) throw new Error(ideaError.message);

  const ideas = (ideaRows ?? []).flatMap((row) => {
    const idea = asIdea(row as Record<string, unknown>);
    return idea ? [idea] : [];
  });

  const ideaIds = [
    ...new Set([
      ...ideas.map((idea) => idea.id),
      ...slots.flatMap((slot) => (slot.idea_id ? [slot.idea_id] : [])),
    ]),
  ];

  const drafts: Record<string, IdeaDraft> = {};
  if (ideaIds.length > 0) {
    const { data: queueRows, error: queueError } = await supabase
      .from("content_queue")
      .select("source_idea_id, status, format, caption, image_paths, carousel_slides, created_at")
      .in("source_idea_id", ideaIds)
      .order("created_at", { ascending: false });
    if (queueError) throw new Error(queueError.message);

    for (const row of queueRows ?? []) {
      const ideaId = row.source_idea_id as string | null;
      if (!ideaId || drafts[ideaId] || row.status === "denied") continue;
      const format = isContentPostFormat(row.format) ? row.format : null;
      const ready = formatNeedsImages(format)
        ? imagesReadyForQueue({
            format,
            carousel_slides: row.carousel_slides as number | null,
            image_paths: (row.image_paths as string[] | null) ?? [],
          })
        : typeof row.caption === "string" && row.caption.trim().length > 0;
      drafts[ideaId] = { ready, pending: !ready };
    }
  }

  return { weekStart, slots, ideas, drafts };
}
