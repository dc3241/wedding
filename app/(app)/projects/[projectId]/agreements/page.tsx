import { redirect } from "next/navigation";
import { ContractCategoryControl } from "@/components/contracts/ContractCategoryControl";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export default async function CoupleContractsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "personal") {
    redirect(`/projects/${projectId}`);
  }

  const stackClass = sectionStackClass("personal");

  const [{ data: fileRows }, { data: vendorRows }, { data: project }] =
    await Promise.all([
      supabase
        .from("files")
        .select(
          "id, name, mime_type, size_bytes, created_at, category, project_vendor_id",
        )
        .eq("project_id", projectId)
        .eq("kind", "contract")
        .order("created_at", { ascending: false }),
      supabase
        .from("project_vendors")
        .select("id, vendors(name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
    ]);

  const vendorOptions = (vendorRows ?? []).flatMap((row) => {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    if (!vendor?.name) return [];
    return [{ id: row.id, name: vendor.name as string }];
  });

  const vendorNameById = new Map(
    vendorOptions.map((v) => [v.id, v.name] as const),
  );

  const fileList: ProjectFile[] = (fileRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    mime_type: row.mime_type,
    size_bytes:
      row.size_bytes === null || row.size_bytes === undefined
        ? null
        : Number(row.size_bytes),
    created_at: row.created_at,
    category: row.category,
  }));

  const trailingSlots = Object.fromEntries(
    (fileRows ?? []).map((row) => {
      const vendorName = row.project_vendor_id
        ? (vendorNameById.get(row.project_vendor_id) ?? null)
        : null;
      return [
        row.id,
        <div
          key={row.id}
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <span className="max-w-[160px] truncate text-[13px] text-muted">
            {vendorName ?? "—"}
          </span>
          <ContractCategoryControl
            fileId={row.id}
            initialCategory={row.category ?? null}
          />
        </div>,
      ];
    }),
  );

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow = projectWorkspaceEyebrow(projectName, weddingDate);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Contracts"
        description="Signed agreements and vendor contracts for your wedding."
      />

      <FileManager
        projectId={projectId}
        kind="contract"
        files={fileList}
        label="Contracts"
        emptyState="No contracts yet"
        trailingSlots={trailingSlots}
        vendorOptions={vendorOptions}
      />
    </div>
  );
}
