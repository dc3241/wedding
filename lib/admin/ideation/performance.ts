import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatLabel, isContentPostFormat } from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import { isPostStyle, postStyleLabel } from "@/lib/admin/content-styles";
import { engagementRate, type PostResult } from "@/lib/admin/post-results";

const LOOKBACK = 60;
const TOP_COUNT = 5;
const BOTTOM_COUNT = 3;
/** Below this many logged posts a "bottom" list would overlap the top. */
const MIN_FOR_BOTTOM = TOP_COUNT + BOTTOM_COUNT - 2;
const COMMENT_CHARS = 280;

type ResultWithPost = PostResult & {
  content_queue: {
    pillar: string | null;
    prompt: string | null;
    post_style: string | null;
    format: string | null;
    carousel_slides: number | null;
  } | null;
};

function n(value: number | null): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : "—";
}

function hookOf(prompt: string | null, pillar: string | null): string {
  const first = (prompt ?? "").split("\n")[0]?.trim();
  return first || (pillar ?? "").trim() || "(no hook saved)";
}

function line(row: ResultWithPost): string {
  const post = row.content_queue;
  const style = isPostStyle(post?.post_style) ? postStyleLabel(post?.post_style) : "unknown style";
  const format = isContentPostFormat(post?.format ?? null) ? formatLabel(post?.format as never) : "post";
  const slides = post?.format === "carousel" && post.carousel_slides ? ` (${post.carousel_slides} slides)` : "";
  const rate = engagementRate(row);
  const rateText = rate === null ? "" : `, ${(rate * 100).toFixed(1)}% engagement`;
  const comments = row.notable_comments?.replace(/\s+/g, " ").trim();
  const commentText = comments
    ? `\n   What people commented: ${JSON.stringify(comments.slice(0, COMMENT_CHARS))}`
    : "";
  return `- Cover/hook: ${JSON.stringify(hookOf(post?.prompt ?? null, post?.pillar ?? null))}
   ${style} · ${format}${slides} · topic: ${post?.pillar ?? "?"}
   ${n(row.views)} views${rateText} (likes ${n(row.likes)}, comments ${n(row.comments)}, shares ${n(row.shares)}, saves ${n(row.saves)})${commentText}`;
}

/**
 * The founders' logged results for this platform, as a prompt block:
 * best performers by views, and the weakest when there are enough to compare.
 * Empty string when nothing is logged or the table is not migrated yet.
 */
export async function performancePromptBlock(
  supabase: SupabaseClient,
  platform: ContentQueuePlatform,
): Promise<{ block: string; logged: number }> {
  const { data, error } = await supabase
    .from("post_results")
    .select(
      "queue_id, platform, post_url, views, likes, comments, shares, saves, notable_comments, updated_at, content_queue(pillar, prompt, post_style, format, carousel_slides)",
    )
    .eq("platform", platform)
    .not("views", "is", null)
    .order("updated_at", { ascending: false })
    .limit(LOOKBACK);
  if (error) {
    console.warn("ideation-performance:", error.message);
    return { block: "", logged: 0 };
  }

  const rows = ((data ?? []) as unknown as ResultWithPost[]).sort(
    (a, b) => (b.views ?? 0) - (a.views ?? 0),
  );
  if (rows.length === 0) return { block: "", logged: 0 };

  const top = rows.slice(0, TOP_COUNT);
  const bottom = rows.length >= MIN_FOR_BOTTOM ? rows.slice(-BOTTOM_COUNT).reverse() : [];
  const parts = [
    `Logged results from this account on this platform (${rows.length} post${rows.length === 1 ? "" : "s"}; small sample, so treat as hints, not rules):`,
    "Best performers:",
    ...top.map(line),
  ];
  if (bottom.length > 0) {
    parts.push("Weakest performers (find what they have in common and avoid it):", ...bottom.map(line));
  }
  return { block: parts.join("\n"), logged: rows.length };
}
