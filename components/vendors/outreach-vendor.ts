export type OutreachVendor = {
  id: string;
  status: "to_contact" | "contacted" | "replied" | "booked" | "declined";
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

/** Stored outreach statuses in pipeline / exit order. */
export const OUTREACH_STATUS_ORDER: OutreachVendor["status"][] = [
  "to_contact",
  "contacted",
  "replied",
  "booked",
  "declined",
];

/** In-flight only — what the Outreach band lists. */
export const IN_FLIGHT_STATUSES = [
  "to_contact",
  "contacted",
  "replied",
] as const satisfies readonly OutreachVendor["status"][];

export type InFlightStatus = (typeof IN_FLIGHT_STATUSES)[number];

export const OUTREACH_STATUS_HEADING: Record<OutreachVendor["status"], string> =
  {
    to_contact: "To contact",
    contacted: "Contacted",
    replied: "Replied",
    booked: "Booked",
    declined: "Declined",
  };

/** Drawn pipeline stops. Declined is an exit, not a stop. */
export const VENDOR_PIPELINE_STEPS = [
  { id: "to_contact", label: "To contact" },
  { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" },
  { id: "booked", label: "Booked" },
] as const;

/**
 * Pill cycle — declined is not in the cycle; it is set via an explicit Decline control.
 * Booked cycles back to to_contact (leave the slot / reopen outreach).
 */
export const OUTREACH_STATUS_CYCLE: Record<
  Exclude<OutreachVendor["status"], "declined">,
  Exclude<OutreachVendor["status"], "declined">
> = {
  to_contact: "contacted",
  contacted: "replied",
  replied: "booked",
  booked: "to_contact",
};

export function pipelineStepState(
  status: OutreachVendor["status"],
  stepIndex: number,
): "complete" | "current" | "upcoming" {
  if (status === "declined") {
    return "upcoming";
  }

  if (status === "booked") {
    return "complete";
  }

  if (status === "replied") {
    if (stepIndex <= 1) return "complete";
    if (stepIndex === 2) return "current";
    return "upcoming";
  }

  if (status === "contacted") {
    if (stepIndex <= 0) return "complete";
    if (stepIndex === 1) return "current";
    return "upcoming";
  }

  if (stepIndex === 0) return "current";
  return "upcoming";
}
