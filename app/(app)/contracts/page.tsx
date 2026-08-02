import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { createClient } from "@/utils/supabase/server";
import { ContractsWorkspace } from "./ContractsWorkspace";
import type { ContractTemplateRow } from "./template-actions";
import type { ArchiveContract, ArchiveWedding } from "./types";

type SearchParams = Promise<{ tab?: string }>;

export default async function AccountContractsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    redirect("/projects");
  }

  const params = await searchParams;
  const initialTab = params.tab === "templates" ? "templates" : "archive";

  // Deliberately includes archived weddings — archive is a records repository.
  const [
    { data: projectRows },
    { data: accountRow },
    { data: templateRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, archived_at")
      .eq("account_id", accountId)
      .order("name", { ascending: true }),
    supabase.from("accounts").select("name").eq("id", accountId).maybeSingle(),
    supabase
      .from("contract_templates")
      .select("id, name, body, category, created_at, updated_at")
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false }),
  ]);

  const weddings: ArchiveWedding[] = (projectRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    archived_at: row.archived_at,
  }));

  const projectIds = weddings.map((w) => w.id);
  const nameById = new Map(weddings.map((w) => [w.id, w.name]));

  let contracts: ArchiveContract[] = [];

  if (projectIds.length > 0) {
    const { data: fileRows } = await supabase
      .from("files")
      .select("id, name, created_at, status, project_id, category")
      .eq("kind", "contract")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    contracts = (fileRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      status: row.status,
      project_id: row.project_id,
      project_name: nameById.get(row.project_id) ?? "Wedding",
      category: row.category ?? null,
    }));
  }

  const templates: ContractTemplateRow[] = (templateRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    body: row.body,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const businessName = accountRow?.name?.trim() || "Planner";

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          eyebrow="Library"
          title="Contracts"
          description="Archive of uploaded contracts across weddings, plus reusable templates."
        />
      </div>
      <ContractsWorkspace
        contracts={contracts}
        weddings={weddings}
        templates={templates}
        businessName={businessName}
        initialTab={initialTab}
      />
    </div>
  );
}
