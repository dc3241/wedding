import type { PillVariant } from "@/components/ui/pill";

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "declined",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type ProposalLineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export type Proposal = {
  id: string;
  lead_id: string;
  title: string;
  line_items: ProposalLineItem[];
  total: number;
  status: ProposalStatus;
  notes: string | null;
  terms: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const PROPOSAL_STATUS_VARIANT: Record<ProposalStatus, PillVariant> = {
  draft: "default",
  sent: "clay",
  accepted: "sage",
  declined: "rosewood",
};

export function formatProposalCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function computeProposalTotal(items: ProposalLineItem[]): number {
  const sum = items.reduce(
    (acc, item) => acc + item.quantity * item.unit_price,
    0,
  );
  return Math.round(sum * 100) / 100;
}

export function parseProposalLineItems(raw: unknown): ProposalLineItem[] {
  if (!Array.isArray(raw)) return [];

  const items: ProposalLineItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const record = entry as Record<string, unknown>;
    const description = String(record.description ?? "").trim();
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);

    if (
      !description ||
      Number.isNaN(quantity) ||
      quantity < 0 ||
      Number.isNaN(unitPrice) ||
      unitPrice < 0
    ) {
      continue;
    }

    items.push({
      id: typeof record.id === "string" ? record.id : crypto.randomUUID(),
      description,
      quantity,
      unit_price: unitPrice,
    });
  }

  return items;
}
