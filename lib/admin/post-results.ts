import type { ContentQueuePlatform } from "@/lib/admin/content-queue";

/** One logged result row, as the UI and the idea engine read it. */
export type PostResult = {
  queue_id: string;
  platform: ContentQueuePlatform;
  post_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  notable_comments: string | null;
  updated_at: string;
};

export type PostResultInput = {
  post_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  notable_comments: string | null;
};

export const RESULT_NUMBER_FIELDS = ["views", "likes", "comments", "shares", "saves"] as const;
export type ResultNumberField = (typeof RESULT_NUMBER_FIELDS)[number];

/** Each platform names its numbers a little differently. */
export function resultFieldLabel(platform: ContentQueuePlatform, field: ResultNumberField): string {
  if (field === "views") return platform === "tiktok" ? "Views" : "Impressions";
  if (field === "likes") return platform === "linkedin" ? "Reactions" : "Likes";
  if (field === "shares") return platform === "linkedin" ? "Reposts" : "Shares";
  if (field === "saves") return platform === "pinterest" ? "Saves" : "Saves / bookmarks";
  return "Comments";
}

/** Likes + comments + shares + saves, over views. Null without views. */
export function engagementRate(r: Pick<PostResult, ResultNumberField>): number | null {
  if (!r.views || r.views <= 0) return null;
  const actions = (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0);
  return actions / r.views;
}

export function hasAnyNumber(r: Pick<PostResult, ResultNumberField>): boolean {
  return RESULT_NUMBER_FIELDS.some((field) => typeof r[field] === "number");
}
