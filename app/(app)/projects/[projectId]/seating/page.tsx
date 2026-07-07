import { SeatingWorkspace } from "./SeatingWorkspace";
import type { SeatingTable } from "./types";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

export default async function SeatingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const { data: rows } = await supabase
    .from("seating_tables")
    .select(
      "id, label, shape, seat_count, kind, pos_x, pos_y, rotation",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const tables: SeatingTable[] = (rows ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    shape: row.shape,
    seat_count: row.seat_count,
    kind: row.kind,
    pos_x: Number(row.pos_x),
    pos_y: Number(row.pos_y),
    rotation: Number(row.rotation),
  }));

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow="Seating"
        title="Floor plan"
        description="Arm a shape to place tables, select one to move or remove it, and use arrow keys for fine adjustments."
      />

      <SeatingWorkspace projectId={projectId} tables={tables} />
    </div>
  );
}
