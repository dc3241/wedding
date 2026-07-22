import type { PillVariant } from "@/components/ui/pill";

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
  contact_email: string | null;
  contact_phone: string | null;
  wedding_date: string | null;
  estimated_budget: number | null;
  venue: string | null;
  source: string | null;
  stage: LeadStage;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
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
