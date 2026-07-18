import Link from "next/link";
import { getAddedPlaceIds } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { VendorSearchForm } from "@/components/vendors/VendorSearchForm";
import type { NeededVendorTarget } from "@/components/vendors/VendorSearchRail";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

function buildOnListByCategoryId(
  rows: { vendors: { category: string | null } | { category: string | null }[] | null }[],
): Record<string, number> {
  const byLabel = new Map(
    VENDOR_CATEGORIES.map((c) => [c.label, c.id] as const),
  );
  const counts: Record<string, number> = {};

  for (const row of rows) {
    const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const raw = vendor?.category?.trim();
    if (!raw) continue;

    const byId = VENDOR_CATEGORIES.find((c) => c.id === raw);
    const id = byId?.id ?? byLabel.get(raw);
    if (!id) continue;

    counts[id] = (counts[id] ?? 0) + 1;
  }

  return counts;
}

export default async function VendorSearchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [addedPlaceIds, profileResult, targetsResult, projectVendorsResult] =
    await Promise.all([
      getAddedPlaceIds(projectId),
      supabase
        .from("wedding_profile")
        .select("location")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("vendor_targets")
        .select("id, category, note")
        .eq("project_id", projectId)
        .eq("status", "needed")
        .order("created_at", { ascending: true }),
      supabase
        .from("project_vendors")
        .select("vendors(category)")
        .eq("project_id", projectId),
    ]);

  const defaultLocation = profileResult.data?.location?.trim() ?? "";

  const neededTargets: NeededVendorTarget[] = (targetsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      category: row.category,
      note: row.note,
    }),
  );

  const initialOnListByCategoryId = buildOnListByCategoryId(
    projectVendorsResult.data ?? [],
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-[13px] text-muted hover:text-ink"
      >
        ← Back to vendors
      </Link>

      <VendorSearchForm
        projectId={projectId}
        defaultLocation={defaultLocation}
        initialAddedPlaceIds={addedPlaceIds}
        neededTargets={neededTargets}
        initialOnListByCategoryId={initialOnListByCategoryId}
      />
    </div>
  );
}
