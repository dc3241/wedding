import { addDays } from "@/lib/admin/content-week";
import { adminToday } from "@/lib/admin/today";

export const OUTREACH_AUDIENCES = ["venue", "planner"] as const;
export const OUTREACH_CHANNELS = ["email", "tiktok"] as const;
export const OUTREACH_PER_AUDIENCE = 5;

export type OutreachAudience = (typeof OUTREACH_AUDIENCES)[number];
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export type OutreachTarget = {
  id: string;
  outreach_date: string;
  audience: OutreachAudience;
  position: number;
  channel: OutreachChannel;
  name: string;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
};

export const AUDIENCE_LABEL: Record<OutreachAudience, string> = {
  venue: "Venues",
  planner: "Planners",
};

export const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  email: "Email",
  tiktok: "TikTok",
};

export function isOutreachAudience(value: unknown): value is OutreachAudience {
  return value === "venue" || value === "planner";
}

export function isOutreachChannel(value: unknown): value is OutreachChannel {
  return value === "email" || value === "tiktok";
}

export function parseOutreachDate(value: string | undefined, today = adminToday()): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return today;
  }
  const earliest = addDays(today, -400);
  const latest = addDays(today, 14);
  if (value < earliest || value > latest) return today;
  return value;
}

export function outreachNamePlaceholder(audience: OutreachAudience, channel: OutreachChannel): string {
  if (channel === "tiktok") return "@handle";
  return audience === "venue" ? "Venue name" : "Planner or studio";
}

/** Text ready to paste. Email leads with the subject line. */
export function outreachCopyText(target: Pick<OutreachTarget, "channel" | "subject" | "body">): string {
  const body = target.body?.trim() ?? "";
  if (!body) return "";
  if (target.channel === "email") {
    const subject = target.subject?.trim();
    return subject ? `Subject: ${subject}\n\n${body}` : body;
  }
  return body;
}
