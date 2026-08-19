import { redirect } from "next/navigation";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { AddLeadForm } from "@/components/leads/AddLeadForm";
import { InquiryIntakeCard } from "@/components/leads/InquiryIntakeCard";
import { LeadsBoard } from "@/components/leads/LeadsBoard";
import type { Lead, LeadStage } from "@/components/leads/types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { ensureInquirySlug } from "@/lib/inquiry/ensure-slug";
import { isLeadStale, leadInactiveDays } from "@/lib/lead-staleness";
import { getCopy } from "@/lib/venue-copy";
import { createClient } from "@/utils/supabase/server";

export default async function LeadsPage() {
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

  const [{ data: rows }, { data: draftRows }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, couple_name, contact_email, contact_phone, wedding_date, estimated_budget, venue, source, stage, notes, position, created_at, updated_at",
      )
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_drafts")
      .select("id, kind, subject, body, status, target_id")
      .eq("account_id", account.accountId)
      .eq("kind", "inquiry_reply")
      .in("status", ["pending", "approved"]),
  ]);

  const leads: Lead[] = (rows ?? []).map((row) => {
    const stage = row.stage as LeadStage;
    const updated_at = row.updated_at;
    const stale = isLeadStale({ stage, updated_at });
    return {
      id: row.id,
      couple_name: row.couple_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      wedding_date: row.wedding_date,
      estimated_budget:
        row.estimated_budget === null || row.estimated_budget === undefined
          ? null
          : Number(row.estimated_budget),
      venue: row.venue,
      source: row.source,
      stage,
      notes: row.notes,
      position: row.position,
      created_at: row.created_at,
      updated_at,
      isStale: stale,
      staleDays: stale ? leadInactiveDays(updated_at) : null,
    };
  });

  const coupleNameById = new Map(
    leads.map((lead) => [lead.id, lead.couple_name]),
  );
  const replyDraftsByLeadId: Record<string, AgentDraftPreview> = {};
  for (const row of draftRows ?? []) {
    replyDraftsByLeadId[row.target_id] = {
      id: row.id,
      kind: "inquiry_reply",
      subject: row.subject,
      body: row.body,
      status: row.status === "approved" ? "approved" : "pending",
      targetLabel: coupleNameById.get(row.target_id)?.trim() || "Inquiry",
    };
  }

  let inquirySlug: string | null = null;
  try {
    inquirySlug = await ensureInquirySlug(
      supabase,
      account.accountId,
      account.kind,
    );
  } catch {
    inquirySlug = null;
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title={getCopy("leadsTitle", account.plan)}
          description={getCopy("leadsDescription", account.plan)}
          actions={<AddLeadForm plan={account.plan} />}
        />
      </div>

      {inquirySlug ? (
        <InquiryIntakeCard slug={inquirySlug} />
      ) : null}

      <LeadsBoard
        initialLeads={leads}
        plan={account.plan}
        replyDraftsByLeadId={replyDraftsByLeadId}
      />
    </div>
  );
}
