import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { uniqueTexts } from "@/lib/admin/content-angles";
import { isPostStyle, type PostStyle } from "@/lib/admin/content-styles";

/** Enough rows to LRU-sort the couple decks after several weeks of shortlists. */
const IDEA_LOOKBACK = 200;
/** Full window for overlap checks. Prompts use a shorter slice. */
const SHOWN_TEXT_LIMIT = 200;
const QUEUE_LOOKBACK = 40;
export const SHOWN_COPY_PROMPT_LIMIT = 50;

export type ContentHistory = {
  recentTopicKeys: string[];
  topicKeysByStyle: Partial<Record<PostStyle, string[]>>;
  shownTexts: string[];
};

export async function loadContentHistory(
  supabase: SupabaseClient,
): Promise<ContentHistory> {
  const [{ data: ideas, error: ideaError }, { data: queue, error: queueError }] =
    await Promise.all([
      supabase
        .from("ideation_items")
        .select("topic_key, post_style, idea_text")
        .order("created_at", { ascending: false })
        .limit(IDEA_LOOKBACK),
      supabase
        .from("content_queue")
        .select("caption, prompt")
        .order("created_at", { ascending: false })
        .limit(QUEUE_LOOKBACK),
    ]);
  if (ideaError) throw new Error(ideaError.message);
  if (queueError) throw new Error(queueError.message);

  const recentTopicKeys = (ideas ?? [])
    .map((row) => row.topic_key as string | null)
    .filter((key): key is string => Boolean(key));

  const topicKeysByStyle: Partial<Record<PostStyle, string[]>> = {};
  for (const row of ideas ?? []) {
    if (!isPostStyle(row.post_style) || typeof row.topic_key !== "string" || !row.topic_key) {
      continue;
    }
    const list = topicKeysByStyle[row.post_style] ?? [];
    list.push(row.topic_key);
    topicKeysByStyle[row.post_style] = list;
  }

  const shownTexts = uniqueTexts(
    [
      ...(ideas ?? []).map((row) => row.idea_text as string | null),
      ...(queue ?? []).flatMap((row) => [row.caption as string | null, row.prompt as string | null]),
    ],
    SHOWN_TEXT_LIMIT,
  );

  return { recentTopicKeys, topicKeysByStyle, shownTexts };
}
