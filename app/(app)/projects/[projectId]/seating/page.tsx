import { SeatingWorkspace } from "./SeatingWorkspace";
import type {
  RosterGuest,
  SeatingAssignment,
  SeatingTable,
} from "./types";
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

export default async function SeatingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [
    { data: tableRows },
    { data: guestRows },
    { data: assignmentRows },
    { data: project },
  ] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("id, label, shape, seat_count, kind, pos_x, pos_y, rotation")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("guests")
      .select("id, full_name")
      .eq("project_id", projectId)
      .order("full_name", { ascending: true }),
    supabase
      .from("seating_assignments")
      .select("id, table_id, guest_id, seat_index")
      .eq("project_id", projectId),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  const tables: SeatingTable[] = (tableRows ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    shape: row.shape,
    seat_count: row.seat_count,
    kind: row.kind,
    pos_x: Number(row.pos_x),
    pos_y: Number(row.pos_y),
    rotation: Number(row.rotation),
  }));

  const guests = (guestRows ?? []) as RosterGuest[];
  const assignments = (assignmentRows ?? []) as SeatingAssignment[];

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Seating"
        description="Place tables, then select a guest and click a table to seat them."
      />

      <SeatingWorkspace
        projectId={projectId}
        tables={tables}
        guests={guests}
        assignments={assignments}
      />
    </div>
  );
}
