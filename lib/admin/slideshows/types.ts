import type { SlideSpec } from "@/lib/admin/content-queue/slide-spec";

export type SlideshowSettings = {
  batch_weekday: number;
  batch_size: number;
  engagement_share: number;
  summary_weekday: number;
  auto_generate: boolean;
  last_batch_on: string | null;
  last_summary_on: string | null;
};

export const DEFAULT_SLIDESHOW_SETTINGS: SlideshowSettings = {
  batch_weekday: 4,
  batch_size: 10,
  engagement_share: 0.5,
  summary_weekday: 0,
  auto_generate: true,
  last_batch_on: null,
  last_summary_on: null,
};

export type SlideshowStatus = "candidate" | "selected" | "discarded" | "expired";

export type SlideshowResultRow = {
  post_id: string;
  post_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  link_clicks: number | null;
  signups: number | null;
  notes: string | null;
  updated_at: string;
};

export type SlideshowResultInput = Omit<SlideshowResultRow, "post_id" | "updated_at">;

export type SlideshowPost = {
  id: string;
  batch_id: string | null;
  origin: "batch" | "custom";
  kind: "tip" | "engage" | "promo";
  mechanic: string;
  feature: string;
  angle_key: string;
  topic: string;
  title: string;
  caption: string;
  pinned_comment: string;
  hook: string;
  utm_campaign: string;
  custom_brief: string | null;
  slide_specs: SlideSpec[];
  image_paths: string[];
  status: SlideshowStatus;
  selected_at: string | null;
  downloaded_at: string | null;
  posted_on: string | null;
  created_at: string;
  /** Short-lived signed URL of slide 1, filled in by the page loader. */
  thumb_url?: string | null;
  result?: SlideshowResultRow | null;
};

export type SlideshowSummary = {
  id: string;
  week_start: string;
  body: string;
  created_at: string;
};

export type SlideshowDirection = {
  id: string;
  summary_id: string | null;
  source: "reply" | "note";
  body: string;
  active: boolean;
  created_at: string;
};

export const SLIDESHOW_TIKTOK_UTM = (campaign: string) =>
  `https://usefirstlook.app/?utm_source=tiktok&utm_medium=social&utm_campaign=${encodeURIComponent(campaign)}`;
