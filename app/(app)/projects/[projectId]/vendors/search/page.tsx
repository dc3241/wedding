import Link from "next/link";
import { getAddedPlaceIds } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { VendorSearchForm } from "@/components/vendors/VendorSearchForm";

export default async function VendorSearchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const addedPlaceIds = await getAddedPlaceIds(projectId);

  // Default location when projects.wedding_area exists; column not in schema yet.
  const defaultLocation = "";

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-[13px] text-ink-muted hover:text-ink"
      >
        ← Back to vendors
      </Link>

      <VendorSearchForm
        projectId={projectId}
        defaultLocation={defaultLocation}
        initialAddedPlaceIds={addedPlaceIds}
      />
    </div>
  );
}
