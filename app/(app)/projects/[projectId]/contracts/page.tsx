import { redirect } from "next/navigation";
import { ContractStatusControl } from "@/components/contracts/ContractStatusControl";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

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

  const { data: fileRows } = await supabase
    .from("files")
    .select("id, name, mime_type, size_bytes, created_at, status")
    .eq("project_id", projectId)
    .eq("kind", "contract")
    .order("created_at", { ascending: false });

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

  return (
    <div className={stackClass}>
      <header>
        <Eyebrow>Contracts</Eyebrow>
        <h1 className="mt-1 text-[20px] font-medium text-ink">
          Wedding contracts
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Signed contracts, proposals, and agreements for this wedding.
        </p>
      </header>

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
