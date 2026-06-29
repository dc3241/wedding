import { redirect } from "next/navigation";
import { AddLeadForm } from "@/components/leads/AddLeadForm";
import { LeadsBoard } from "@/components/leads/LeadsBoard";
import type { Lead, LeadStage } from "@/components/leads/types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
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

  const { data: rows } = await supabase
    .from("leads")
    .select(
      "id, couple_name, contact_email, contact_phone, wedding_date, estimated_budget, venue, source, stage, notes, position, created_at, updated_at",
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const leads: Lead[] = (rows ?? []).map((row) => ({
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
    stage: row.stage as LeadStage,
    notes: row.notes,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="CRM"
          title="Leads"
          description="Track prospective couples from first inquiry through booked or lost."
          actions={<AddLeadForm />}
        />
      </div>

      <LeadsBoard initialLeads={leads} />
    </div>
  );
}
