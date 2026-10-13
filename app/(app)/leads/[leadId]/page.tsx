import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  isLeadEmailDraftKind,
  type AgentDraftPreview,
} from "@/components/assistant/types";
import { LeadRecord } from "@/components/leads/LeadRecord";
import { buildLeadTimeline } from "@/components/leads/lead-timeline";
import { ProposalsSection } from "@/components/proposals/ProposalsSection";
import {
  parseProposalLineItems,
  type Proposal,
  type ProposalInvoiceLink,
  type ProposalProjectOption,
  type ProposalStatus,
} from "@/components/proposals/types";
import {
  LEAD_STAGE_LABEL,
  LEAD_STAGE_VARIANT,
  type Lead,
  type LeadDateShare,
  type LeadStage,
} from "@/components/leads/types";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { getAccountContext } from "@/lib/account-context";
import { isLeadStale, leadInactiveDays } from "@/lib/lead-staleness";
import { eventTypeLabel, parseEventType } from "@/lib/event-type";
import { getCopy } from "@/lib/venue-copy";
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

  const [
    { data: leadRow },
    { data: proposalRows },
    { data: projectRows },
    { data: messageRows },
    { data: draftRows },
  ] = await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, couple_name, event_type, contact_email, contact_phone, wedding_date, estimated_budget, estimated_guest_count, venue, source, stage, notes, project_id, created_at, updated_at, next_followup_on, next_followup_action, lost_reason, lost_note",
        )
        .eq("id", leadId)
        .maybeSingle(),
      supabase
        .from("proposals")
        .select(
          "id, lead_id, title, line_items, total, status, notes, terms, accepted_at, signed_name, access_token, created_at, updated_at",
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("account_id", account.accountId)
        .is("archived_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("outreach_messages")
        .select("id, subject, body, status, sent_at, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("agent_drafts")
        .select("id, kind, subject, body, status, target_id")
        .eq("account_id", account.accountId)
        .eq("target_id", leadId)
        .in("kind", ["inquiry_reply", "workflow_email"])
        .in("status", ["pending", "approved"])
        .limit(1),
    ]);

  if (!leadRow) {
    notFound();
  }

  const lead: Lead = {
    id: leadRow.id,
    couple_name: leadRow.couple_name,
    event_type: parseEventType(leadRow.event_type),
    contact_email: leadRow.contact_email,
    contact_phone: leadRow.contact_phone,
    wedding_date: leadRow.wedding_date,
    estimated_budget:
      leadRow.estimated_budget === null || leadRow.estimated_budget === undefined
        ? null
        : Number(leadRow.estimated_budget),
    estimated_guest_count:
      leadRow.estimated_guest_count === null ||
      leadRow.estimated_guest_count === undefined
        ? null
        : Number(leadRow.estimated_guest_count),
    venue: leadRow.venue,
    source: leadRow.source,
    stage: leadRow.stage as LeadStage,
    lost_reason: leadRow.lost_reason,
    lost_note: leadRow.lost_note,
    notes: leadRow.notes,
    position: 0,
    created_at: leadRow.created_at,
    updated_at: leadRow.updated_at,
    next_followup_on: leadRow.next_followup_on,
    next_followup_action: leadRow.next_followup_action,
  };
  const stale = isLeadStale({ stage: lead.stage, updated_at: lead.updated_at });
  lead.isStale = stale;
  lead.staleDays = stale ? leadInactiveDays(lead.updated_at) : null;

  const draftRow = (draftRows ?? []).find((row) =>
    isLeadEmailDraftKind(row.kind),
  );
  const replyDraft: AgentDraftPreview | null =
    draftRow && isLeadEmailDraftKind(draftRow.kind)
      ? {
          id: draftRow.id,
          kind: draftRow.kind,
          subject: draftRow.subject,
          body: draftRow.body,
          status: draftRow.status === "approved" ? "approved" : "pending",
          targetLabel: lead.couple_name.trim() || "Inquiry",
        }
      : null;

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
    signed_name:
      typeof row.signed_name === "string" ? row.signed_name : null,
    access_token: row.access_token,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const dateShares = await loadDateShares(supabase, {
    accountId: account.accountId,
    leadId,
    weddingDate: lead.wedding_date,
    stage: lead.stage,
    projectId: leadRow.project_id,
  });

  const timeline = buildLeadTimeline({
    leadId: lead.id,
    createdAt: lead.created_at,
    source: lead.source,
    messages: messageRows ?? [],
    proposals,
  });

  const projects: ProposalProjectOption[] = (projectRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }));

  let linkedProject: ProposalProjectOption | null = null;
  if (leadRow.project_id) {
    linkedProject =
      projects.find((row) => row.id === leadRow.project_id) ?? null;
    if (!linkedProject) {
      const { data: linkedRow } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", leadRow.project_id)
        .maybeSingle();
      if (linkedRow) {
        linkedProject = { id: linkedRow.id, name: linkedRow.name };
      }
    }
  }

  const proposalIds = proposals.map((row) => row.id);
  const invoicesByProposalId: Record<string, ProposalInvoiceLink[]> = {};
  if (proposalIds.length > 0) {
    const { data: invoiceRows } = await supabase
      .from("invoices")
      .select("id, project_id, invoice_number, status, proposal_id")
      .in("proposal_id", proposalIds)
      .order("created_at", { ascending: false });

    for (const row of invoiceRows ?? []) {
      if (!row.proposal_id) continue;
      const list = invoicesByProposalId[row.proposal_id] ?? [];
      list.push({
        id: row.id,
        projectId: row.project_id,
        invoiceNumber: row.invoice_number,
        status: row.status,
      });
      invoicesByProposalId[row.proposal_id] = list;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <Link
          href="/leads"
          className="mb-3 inline-block text-[13px] text-muted no-underline hover:text-ink"
        >
          {getCopy("backToLeads", account.plan)}
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
              <Pill variant="default">{eventTypeLabel(lead.event_type)}</Pill>
              {lead.isStale ? (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-rosewood">
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-rosewood"
                    aria-hidden
                  />
                  No activity in {lead.staleDays ?? "?"}d
                </span>
              ) : null}
            </div>
          </div>
          {linkedProject ? (
            <ButtonLink
              href={`/projects/${linkedProject.id}`}
              variant="default"
              className="px-4 py-2 text-[13px]"
            >
              {getCopy("openProject", account.plan)}
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <LeadRecord
        lead={lead}
        timeline={timeline}
        replyDraft={replyDraft}
        dateShares={dateShares}
        plan={account.plan}
      >
        <ProposalsSection
          leadId={leadId}
          proposals={proposals}
          projects={projects}
          invoicesByProposalId={invoicesByProposalId}
          linkedProject={linkedProject}
          plan={account.plan}
        />
      </LeadRecord>
    </div>
  );
}

async function loadDateShares(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    accountId: string;
    leadId: string;
    weddingDate: string | null;
    stage: LeadStage;
    projectId: string | null;
  },
): Promise<LeadDateShare[]> {
  if (!input.weddingDate || input.stage === "lost") return [];

  const [{ data: leadRows }, { data: projectRows }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, couple_name")
      .eq("account_id", input.accountId)
      .eq("wedding_date", input.weddingDate)
      .neq("id", input.leadId)
      .is("project_id", null)
      .in("stage", ["inquiry", "contacted", "proposal", "booked"]),
    supabase
      .from("projects")
      .select("id, name")
      .eq("account_id", input.accountId)
      .eq("wedding_date", input.weddingDate)
      .is("archived_at", null),
  ]);

  const shares: LeadDateShare[] = [];
  for (const row of leadRows ?? []) {
    const name = row.couple_name?.trim();
    if (!name) continue;
    shares.push({ id: row.id, name, href: `/leads/${row.id}` });
  }
  for (const row of projectRows ?? []) {
    if (row.id === input.projectId) continue;
    const name = row.name?.trim();
    if (!name) continue;
    shares.push({ id: row.id, name, href: `/projects/${row.id}` });
  }
  return shares;
}
