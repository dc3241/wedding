import type { PillVariant } from "@/components/ui/pill";
import type { EventType } from "@/lib/event-type";

export const LEAD_STAGES = [
  "inquiry",
  "contacted",
  "proposal",
  "booked",
  "lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export type Lead = {
  id: string;
  couple_name: string;
  event_type: EventType;
  contact_email: string | null;
  contact_phone: string | null;
  wedding_date: string | null;
  estimated_budget: number | null;
  estimated_guest_count?: number | null;
  venue: string | null;
  source: string | null;
  stage: LeadStage;
  lost_reason?: string | null;
  lost_note?: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  /** Server-derived; never computed on the client. */
  isStale?: boolean;
  /** Whole days since updated_at when isStale; for the pipeline label only. */
  staleDays?: number | null;
  next_followup_on?: string | null;
  next_followup_action?: string | null;
};

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  inquiry: "Inquiry",
  contacted: "Contacted",
  proposal: "Proposal",
  booked: "Booked",
  lost: "Lost",
};

export const LEAD_STAGE_VARIANT: Record<LeadStage, PillVariant> = {
  inquiry: "default",
  contacted: "clay",
  proposal: "clay",
  booked: "sage",
  lost: "rosewood",
};

export function formatLeadDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLeadBudget(amount: number | null) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type LeadDateShare = {
  id: string;
  name: string;
  href: string;
};

export function localISODate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function followupTiming(
  date: string | null | undefined,
  now: Date = new Date(),
): "overdue" | "today" | "upcoming" | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = localISODate(now);
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
}
