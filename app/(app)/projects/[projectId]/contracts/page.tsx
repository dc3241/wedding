import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContractCategoryControl } from "@/components/contracts/ContractCategoryControl";
import { ContractStatusControl } from "@/components/contracts/ContractStatusControl";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

function formatSignedDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "business") {
    redirect(`/projects/${projectId}`);
  }

  const stackClass = sectionStackClass("business");

  const [{ data: fileRows }, { data: project }, { data: signedRows }] =
    await Promise.all([
    supabase
      .from("files")
      .select("id, name, mime_type, size_bytes, created_at, status, category")
      .eq("project_id", projectId)
      .eq("kind", "contract")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("proposals")
      .select("id, lead_id, title, signed_name, accepted_at, leads!inner(project_id)")
      .eq("leads.project_id", projectId)
      .eq("status", "accepted")
      .not("signed_name", "is", null)
      .order("accepted_at", { ascending: false }),
  ]);

  const fileList: ProjectFile[] = (fileRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    mime_type: row.mime_type,
    size_bytes:
      row.size_bytes === null || row.size_bytes === undefined
        ? null
        : Number(row.size_bytes),
    created_at: row.created_at,
    status: row.status,
    category: row.category,
  }));

  const trailingSlots = Object.fromEntries(
    fileList.map((file) => [
      file.id,
      <Fragment key={file.id}>
        <ContractCategoryControl
          fileId={file.id}
          initialCategory={file.category ?? null}
        />
        <ContractStatusControl
          fileId={file.id}
          initialStatus={file.status ?? null}
        />
      </Fragment>,
    ]),
  );

  const signedProposals = (signedRows ?? []).flatMap((row) => {
    const signedName =
      typeof row.signed_name === "string" ? row.signed_name.trim() : "";
    if (!signedName) return [];
    return [
      {
        id: row.id,
        leadId: row.lead_id,
        title: row.title,
        signedName,
        acceptedAt: formatSignedDate(row.accepted_at),
      },
    ];
  });

  const projectName = project?.name ?? "Wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow = projectWorkspaceEyebrow(projectName, weddingDate);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Contracts"
        description="Signed contracts, proposals, and agreements for this wedding."
      />

      {signedProposals.length > 0 ? (
        <section className="space-y-3">
          <Eyebrow>Signed proposals</Eyebrow>
          <Card className="min-w-0 px-3.5 py-3.5">
            <ul>
              {signedProposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="mb-2 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0"
                >
                  <Link
                    href={`/leads/${proposal.leadId}/proposals/${proposal.id}/contract`}
                    className="text-[15px] font-medium text-ink no-underline hover:text-accent"
                  >
                    {proposal.title}
                  </Link>
                  <p className="mt-1 text-[13px] text-muted">
                    Signed by {proposal.signedName}
                    {proposal.acceptedAt ? ` · ${proposal.acceptedAt}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <FileManager
        projectId={projectId}
        kind="contract"
        files={fileList}
        label="Contracts"
        emptyState="No contracts uploaded yet. Add signed agreements, proposals, and vendor contracts here."
        trailingSlots={trailingSlots}
      />
    </div>
  );
}
