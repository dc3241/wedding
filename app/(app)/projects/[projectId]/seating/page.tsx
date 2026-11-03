import { SeatingRulesCard } from "./SeatingRulesCard";
import { SeatingWorkspace } from "./SeatingWorkspace";
import type {
  RosterPerson,
  SeatingAssignment,
  SeatingTable,
  SeatingTableKind,
  SeatingTableShape,
} from "./types";
import { isSeatingTableKind, isSeatingTableShape } from "./types";
import type { RsvpStatus } from "@/app/(app)/projects/[projectId]/guests/types";
import { RSVP_STATUSES } from "@/app/(app)/projects/[projectId]/guests/types";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
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
    { data: memberRows },
    { data: assignmentRows },
    { data: project },
    { data: ruleRows },
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
    supabase
      .from("seating_rules")
      .select("id, kind, member_a, member_b")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
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

  people.sort((a, b) => {
    const aHouse = (a.household_name ?? "").localeCompare(b.household_name ?? "");
    if (aHouse !== 0) return aHouse;
    const aName = (a.name ?? "").localeCompare(b.name ?? "");
    if (aName !== 0) return aName;
    return a.id.localeCompare(b.id);
  });

  const assignments: SeatingAssignment[] = (assignmentRows ?? []).flatMap(
    (row) => {
      if (!row.guest_member_id) return [];
      return [
        {
          id: row.id,
          table_id: row.table_id,
          guest_member_id: row.guest_member_id,
          seat_index:
            row.seat_index == null ? null : Number(row.seat_index),
        },
      ];
    },
  );

  const personName = new Map(
    people.map((p) => [p.id, p.name?.trim() || "Guest"]),
  );
  const personLabel = new Map(
    people.map((p) => [
      p.id,
      `${p.name?.trim() || "Guest"}${p.household_name ? ` (${p.household_name})` : ""}`,
    ]),
  );
  const rules = (ruleRows ?? []).flatMap((row) =>
    row.kind === "together" || row.kind === "apart"
      ? [
          {
            id: row.id as string,
            kind: row.kind as "together" | "apart",
            aName: personName.get(row.member_a as string) ?? "Guest",
            bName: personName.get(row.member_b as string) ?? "Guest",
          },
        ]
      : [],
  );
  const rulePeople = people.map((p) => ({
    id: p.id,
    label: personLabel.get(p.id) ?? "Guest",
  }));

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow = projectWorkspaceEyebrow(projectName, weddingDate);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Seating"
        description="Place tables, then click a seat and pick a person — or click a seated person to move, swap, or unseat."
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink
              href={`/projects/${projectId}/seating/print`}
              variant="secondary"
              className="text-[13px] !px-3.5 !py-2"
            >
              Print / export
            </ButtonLink>
            <TourHelpButton tourKey="seating" />
          </div>
        }
      />

      <SeatingWorkspace
        projectId={projectId}
        tables={tables}
        people={people}
        assignments={assignments}
      />

      <SeatingRulesCard projectId={projectId} rules={rules} people={rulePeople} />
    </div>
  );
}
