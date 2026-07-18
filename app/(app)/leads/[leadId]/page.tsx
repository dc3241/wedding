import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";
import {
  parseProposalLineItems,
  type Proposal,
  type ProposalStatus,
} from "@/components/proposals/types";
import {
  formatLeadBudget,
  formatLeadDate,
  LEAD_STAGE_LABEL,
  LEAD_STAGE_VARIANT,
  type Lead,
  type LeadStage,
} from "@/components/leads/types";
import { Pill } from "@/components/ui/pill";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "personal") {
    if (account.singleProjectId) {
      redirect(`/projects/${account.singleProjectId}`);
    }
    redirect("/projects");
  }

  const [{ data: leadRow }, { data: proposalRows }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, couple_name, contact_email, contact_phone, wedding_date, estimated_budget, venue, source, stage, notes",
      )
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from("proposals")
      .select(
        "id, lead_id, title, line_items, total, status, notes, terms, accepted_at, created_at, updated_at",
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
  ]);

  if (!leadRow) {
    notFound();
  }

  const lead: Lead = {
    id: leadRow.id,
    couple_name: leadRow.couple_name,
    contact_email: leadRow.contact_email,
    contact_phone: leadRow.contact_phone,
    wedding_date: leadRow.wedding_date,
    estimated_budget:
      leadRow.estimated_budget === null || leadRow.estimated_budget === undefined
        ? null
        : Number(leadRow.estimated_budget),
    venue: leadRow.venue,
    source: leadRow.source,
    stage: leadRow.stage as LeadStage,
    notes: leadRow.notes,
    position: 0,
    created_at: "",
    updated_at: "",
  };

  const proposals: Proposal[] = (proposalRows ?? []).map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    title: row.title,
    line_items: parseProposalLineItems(row.line_items),
    total: Number(row.total),
    status: row.status as ProposalStatus,
    notes: row.notes,
    terms: row.terms,
    accepted_at: row.accepted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const weddingDate = formatLeadDate(lead.wedding_date);
  const budget = formatLeadBudget(lead.estimated_budget);
  const contact = [lead.contact_email, lead.contact_phone]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-6">
        <Link
          href="/leads"
          className="mb-3 inline-block text-[13px] text-muted no-underline hover:text-ink"
        >
          ← Back to leads
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[42px] font-extrabold tracking-[-0.03em] text-ink max-md:text-[32px]">
              {lead.couple_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <Pill variant={LEAD_STAGE_VARIANT[lead.stage]}>
                {LEAD_STAGE_LABEL[lead.stage]}
              </Pill>
              {weddingDate ? (
                <span className="text-[13px] text-muted">{weddingDate}</span>
              ) : null}
              {budget ? (
                <span className="text-[13px] tabular-nums text-muted">
                  {budget}
                </span>
              ) : null}
            </div>
            {contact ? (
              <p className="mt-1 text-[13px] text-muted">{contact}</p>
            ) : null}
            {lead.venue ? (
              <p className="mt-1 text-[13px] text-muted">{lead.venue}</p>
            ) : null}
            {lead.source ? (
              <p className="mt-1 text-[13px] text-muted">via {lead.source}</p>
            ) : null}
          </div>
        </div>
      </div>

      <ProposalsSection leadId={leadId} proposals={proposals} />
    </div>
  );
}
