import "server-only";

import {
  computeProposalTotal,
  parseProposalLineItems,
  PROPOSAL_STATUSES,
  type ProposalLineItem,
  type ProposalStatus,
} from "@/components/proposals/types";
import type { ProjectBranding } from "@/lib/branding/types";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type PublicProposal = {
  title: string;
  status: ProposalStatus;
  notes: string | null;
  terms: string | null;
  total: number;
  line_items: ProposalLineItem[];
  accepted_at: string | null;
  couple_name: string;
  wedding_date: string | null;
  account_name: string;
  branding: ProjectBranding | null;
};

function asStatus(value: unknown): ProposalStatus | null {
  if (typeof value !== "string") return null;
  return (PROPOSAL_STATUSES as readonly string[]).includes(value)
    ? (value as ProposalStatus)
    : null;
}

function asBranding(row: Record<string, unknown>): ProjectBranding | null {
  const brandName = typeof row.brand_name === "string" ? row.brand_name : null;
  const brandLogoUrl =
    typeof row.brand_logo_url === "string" ? row.brand_logo_url : null;
  const brandAccentColor =
    typeof row.brand_accent_color === "string" ? row.brand_accent_color : null;
  if (!brandName?.trim() && !brandLogoUrl?.trim() && !brandAccentColor?.trim()) {
    return null;
  }
  return { brandName, brandLogoUrl, brandAccentColor };
}

export async function getPublicProposalByToken(
  token: string,
): Promise<PublicProposal | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("get_proposal_by_token", {
    p_token: trimmed,
  });

  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.proposal_found !== true) return null;

  const status = asStatus(row.status);
  if (!status) return null;

  const lineItems = parseProposalLineItems(row.line_items);
  const total =
    typeof row.total === "number"
      ? row.total
      : Number(row.total) || computeProposalTotal(lineItems);

  return {
    title: typeof row.title === "string" ? row.title : "Proposal",
    status,
    notes: typeof row.notes === "string" ? row.notes : null,
    terms: typeof row.terms === "string" ? row.terms : null,
    total,
    line_items: lineItems,
    accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
    couple_name:
      typeof row.couple_name === "string" ? row.couple_name : "there",
    wedding_date:
      typeof row.wedding_date === "string" ? row.wedding_date : null,
    account_name:
      typeof row.account_name === "string" ? row.account_name : "",
    branding: asBranding(row as Record<string, unknown>),
  };
}
