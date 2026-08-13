import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContractDocument } from "@/components/proposals/ContractDocument";
import { parseProposalLineItems } from "@/components/proposals/types";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

export default async function ProposalContractPage({
  params,
}: {
  params: Promise<{ leadId: string; proposalId: string }>;
}) {
  const { leadId, proposalId } = await params;
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

  const [{ data: leadRow }, { data: proposalRow }, { data: businessAccount }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, couple_name")
        .eq("id", leadId)
        .maybeSingle(),
      supabase
        .from("proposals")
        .select(
          "id, lead_id, title, line_items, total, status, terms, accepted_at",
        )
        .eq("id", proposalId)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("name, kind")
        .eq("id", account.accountId)
        .maybeSingle(),
    ]);

  if (!leadRow || !proposalRow || proposalRow.lead_id !== leadId) {
    notFound();
  }

  if (proposalRow.status !== "accepted") {
    notFound();
  }

  const businessName = businessAccount?.name ?? "Planner";

  const lineItems = parseProposalLineItems(proposalRow.line_items);

  return (
    <div className="mx-auto w-full max-w-[900px] py-2">
      <ContractDocument
        businessName={businessName}
        coupleName={leadRow.couple_name}
        proposalTitle={proposalRow.title}
        lineItems={lineItems}
        total={Number(proposalRow.total)}
        terms={proposalRow.terms}
        acceptedAt={proposalRow.accepted_at}
        leadId={leadId}
      />
    </div>
  );
}
