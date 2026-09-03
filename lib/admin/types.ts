import type { ContentPlatform, ContentType, DayPlatforms } from "@/lib/admin/platforms";

export type ScheduleWeek = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
};

export type ScheduleDay = {
  id: string;
  week_id: string;
  date: string;
  platforms: DayPlatforms;
  notes_couples: string | null;
  notes_planner: string | null;
};

export type SchedulePerformance = {
  id: string;
  week_id: string;
  views: string | null;
  follower_growth: string | null;
  dms: string | null;
  signups: string | null;
  notes: string | null;
};

export type WeekWithDetail = ScheduleWeek & {
  days: ScheduleDay[];
  performance: SchedulePerformance | null;
};

export type ContentBankItem = {
  id: string;
  platform: ContentPlatform;
  idea: string;
  type: ContentType | null;
  format: string | null;
  title: string | null;
  body: string;
  notes: string | null;
  created_at: string;
};

export type AdminAutomationPrompt = {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  is_manual_trigger: boolean;
};

export type AdminAutomationRun = {
  id: string;
  prompt_id: string | null;
  triggered_by: string | null;
  input_text: string | null;
  output_text: string | null;
  status: "pending" | "running" | "completed" | "error";
  error_message: string | null;
  saved_to_bank: boolean;
  created_at: string;
  completed_at: string | null;
};

export type MediaAsset = {
  id: string;
  filename: string;
  storage_path: string;
  uploaded_by: string | null;
  file_size: number | null;
  content_type: string | null;
  status: "new" | "in_progress" | "ready" | "posted";
  notes: string | null;
  created_at: string;
};

export type IdeationItem = {
  id: string;
  idea_text: string;
  requested_by: string | null;
  rating: "up" | "down" | null;
  comment: string | null;
  created_at: string;
};
