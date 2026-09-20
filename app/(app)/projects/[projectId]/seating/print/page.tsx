import { SeatingExportDocument } from "./SeatingExportDocument";
import type {
  RosterPerson,
  SeatingAssignment,
  SeatingTable,
  SeatingTableKind,
  SeatingTableShape,
} from "../types";
import { isSeatingTableKind, isSeatingTableShape } from "../types";
import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import { RSVP_STATUSES } from "@/app/(app)/projects/[projectId]/guests/types";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { buildTableAssignmentExport } from "@/lib/guest-exports/tables";
import { createClient } from "@/utils/supabase/server";

function parseTableKind(value: string): SeatingTableKind | null {
  if (isSeatingTableKind(value) || value === "dancefloor") {
    return value;
  }
  return null;
}

function parseTableShape(value: string): SeatingTableShape | null {
  return isSeatingTableShape(value) ? value : null;
}

function parseRsvpStatus(value: unknown): RsvpStatus {
  return RSVP_STATUSES.includes(value as RsvpStatus)
    ? (value as RsvpStatus)
    : "pending";
}

export default async function SeatingPrintPage({
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
    { data: memberRows },
    { data: assignmentRows },
    { data: project },
  ] = await Promise.all([
    supabase
      .from("seating_tables")
      .select("id, label, shape, seat_count, kind, pos_x, pos_y, rotation")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("guest_members")
      .select(
        "id, guest_id, name, relationship, sort_order, guests(id, full_name, household, rsvp_status)",
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("seating_assignments")
      .select("id, table_id, guest_member_id, seat_index")
      .eq("project_id", projectId),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  const tables: SeatingTable[] = (tableRows ?? []).flatMap((row) => {
    const shape = parseTableShape(row.shape);
    const kind = parseTableKind(row.kind);
    if (!shape || !kind) return [];

    return [
      {
        id: row.id,
        label: row.label,
        shape,
        seat_count: row.seat_count,
        kind,
        pos_x: Number(row.pos_x),
        pos_y: Number(row.pos_y),
        rotation: Number(row.rotation),
      },
    ];
  });

  const people: RosterPerson[] = (memberRows ?? []).flatMap((row) => {
    const guestJoin = row.guests;
    const guest = Array.isArray(guestJoin) ? guestJoin[0] : guestJoin;
    if (!guest || typeof guest !== "object") return [];

    const guestRecord = guest as {
      id: string;
      full_name: string | null;
      household: string | null;
      rsvp_status: string | null;
    };

    return [
      {
        id: row.id,
        name: row.name,
        guest_id: row.guest_id,
        household_name: guestRecord.full_name,
        household_label: guestRecord.household,
        relationship: row.relationship,
        rsvp_status: parseRsvpStatus(guestRecord.rsvp_status),
      },
    ];
  });

  const assignments: SeatingAssignment[] = (assignmentRows ?? []).flatMap(
    (row) => {
      if (!row.guest_member_id) return [];
      return [
        {
          id: row.id,
          table_id: row.table_id,
          guest_member_id: row.guest_member_id,
          seat_index: row.seat_index == null ? null : Number(row.seat_index),
        },
      ];
    },
  );

  const data = buildTableAssignmentExport(tables, people, assignments);

  return (
    <div className={stackClass}>
      <SeatingExportDocument
        projectId={projectId}
        coupleNames={project?.name ?? "Wedding"}
        weddingDate={project?.wedding_date ?? null}
        data={data}
      />
    </div>
  );
}
