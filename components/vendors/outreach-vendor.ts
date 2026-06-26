export type OutreachVendor = {
  id: string;
  status: "to_contact" | "contacted" | "booked" | "declined";
  quoted_price: number | null;
  vendor: {
    id: string;
    name: string;
    category: string | null;
    contact_email: string | null;
    website: string | null;
    ai_overview: string | null;
    last_enriched_at: string | null;
  };
};

export const OUTREACH_STATUS_ORDER: OutreachVendor["status"][] = [
  "to_contact",
  "contacted",
  "booked",
  "declined",
];

export const OUTREACH_STATUS_HEADING: Record<OutreachVendor["status"], string> =
  {
    to_contact: "To contact",
    contacted: "Contacted",
    booked: "Booked",
    declined: "Declined",
  };

/** Visual pipeline steps for the quiet stepper (replied is display-only until in schema). */
export const VENDOR_PIPELINE_STEPS = [
  { id: "to_contact", label: "To contact" },
  { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" },
  { id: "booked", label: "Booked" },
] as const;

export function pipelineStepState(
  status: OutreachVendor["status"],
  stepIndex: number,
): "complete" | "current" | "upcoming" {
  if (status === "declined") {
    return stepIndex === 0 ? "current" : "upcoming";
  }

  if (status === "booked") {
    return "complete";
  }

  if (status === "contacted") {
    if (stepIndex <= 0) return "complete";
    if (stepIndex === 1) return "current";
    return "upcoming";
  }

  if (stepIndex === 0) return "current";
  return "upcoming";
}
