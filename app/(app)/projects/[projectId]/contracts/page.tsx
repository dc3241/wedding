import { redirect } from "next/navigation";
import { ContractStatusControl } from "@/components/contracts/ContractStatusControl";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
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

  const [{ data: fileRows }, { data: project }] = await Promise.all([
    supabase
      .from("files")
      .select("id, name, mime_type, size_bytes, created_at, status")
      .eq("project_id", projectId)
      .eq("kind", "contract")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
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
  }));

  const trailingSlots = Object.fromEntries(
    fileList.map((file) => [
      file.id,
      <ContractStatusControl
        key={file.id}
        fileId={file.id}
        initialStatus={file.status ?? null}
      />,
    ]),
  );

  const projectName = project?.name ?? "Wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Contracts"
        description="Signed contracts, proposals, and agreements for this wedding."
      />

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
