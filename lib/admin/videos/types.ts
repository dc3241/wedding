import type { Segment, VoiceAlignment } from "./script";

export const VIDEO_BUCKET = "video-assets";
/** First Look Voice (ElevenLabs). One take per video, sped up 10% at render. */
export const FIRST_LOOK_VOICE_ID = "zRFusN7VnerfWfwQEYce";

export type VideoStage = "idea" | "scripted" | "discarded" | "expired";
export type RenderStatus = "idle" | "rendering" | "done" | "failed";

export type VideoPost = {
  id: string;
  idea_batch_id: string | null;
  kind: "tip" | "engage" | "promo";
  mechanic: string;
  feature: string;
  angle_key: string;
  title: string;
  hook: string;
  concept: string;
  stage: VideoStage;
  script: Segment[];
  caption: string;
  pinned_comment: string;
  utm_campaign: string;
  vo_path: string | null;
  vo_duration: number | null;
  vo_words: VoiceAlignment | null;
  vo_text: string | null;
  render_status: RenderStatus;
  render_error: string | null;
  video_path: string | null;
  rendered_at: string | null;
  created_at: string;
  updated_at: string;
  /** Filled by the page loader. */
  vo_url?: string | null;
  video_url?: string | null;
};

export type VideoFootage = {
  id: string;
  title: string;
  description: string;
  feature: string;
  tags: string[];
  path: string;
  media_type: "video" | "image";
  duration_sec: number | null;
  size_bytes: number | null;
  created_at: string;
  url?: string | null;
};
