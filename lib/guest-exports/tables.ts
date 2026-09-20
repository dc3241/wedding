import {
  formatPersonName,
  isSeatableTable,
  occupiesNumberedSeat,
  type RosterPerson,
  type SeatingAssignment,
  type SeatingTable,
} from "@/app/(app)/projects/[projectId]/seating/types";
import type { TableAssignmentCsvRow } from "@/lib/guest-exports/csv";
import { envelopeName, rsvpLabel } from "@/lib/guest-exports/format";

export type TableExportPerson = {
  memberId: string;
  seat: string;
  name: string;
  household: string;
  rsvp: string;
  declined: boolean;
};

export type TableExportGroup = {
  tableId: string;
  tableLabel: string;
  occupied: number;
  seatCount: number;
  people: TableExportPerson[];
};

export type TableAssignmentExport = {
  groups: TableExportGroup[];
  unseated: TableExportPerson[];
};

export function buildTableAssignmentExport(
  tables: SeatingTable[],
  people: RosterPerson[],
  assignments: SeatingAssignment[],
): TableAssignmentExport {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const assignmentByMember = new Map<string, SeatingAssignment>();
  const assignmentsByTable = new Map<string, SeatingAssignment[]>();

  for (const assignment of assignments) {
    assignmentByMember.set(assignment.guest_member_id, assignment);
    const list = assignmentsByTable.get(assignment.table_id) ?? [];
    list.push(assignment);
    assignmentsByTable.set(assignment.table_id, list);
  }

  const groups: TableExportGroup[] = tables
    .filter(isSeatableTable)
    .slice()
    .sort((a, b) =>
      a.label.localeCompare(b.label, "en-US", { sensitivity: "base" }),
    )
    .map((table) => {
      const seated = (assignmentsByTable.get(table.id) ?? [])
        .flatMap((assignment) => {
          const person = peopleById.get(assignment.guest_member_id);
          if (!person) return [];
          return [toExportPerson(person, assignment, table.seat_count)];
        })
        .sort(compareSeated);

      return {
        tableId: table.id,
        tableLabel: table.label,
        occupied: seated.length,
        seatCount: table.seat_count,
        people: seated,
      };
    });

  const unseated = people
    .filter((person) => !assignmentByMember.has(person.id))
    .map((person) => toExportPerson(person, null, null))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }),
    );

  return { groups, unseated };
}

export function flattenTableAssignmentRows(
  data: TableAssignmentExport,
): TableAssignmentCsvRow[] {
  const seated = data.groups.flatMap((group) =>
    group.people.map((person) => ({
      table: group.tableLabel,
      seat: person.seat,
      name: person.name,
      household: person.household,
      rsvp: person.rsvp,
    })),
  );
  const unseated = data.unseated.map((person) => ({
    table: "Not seated",
    seat: "",
    name: person.name,
    household: person.household,
    rsvp: person.rsvp,
  }));
  return [...seated, ...unseated];
}

function toExportPerson(
  person: RosterPerson,
  assignment: SeatingAssignment | null,
  seatCount: number | null,
): TableExportPerson {
  const seated =
    assignment != null &&
    seatCount != null &&
    occupiesNumberedSeat(assignment.seat_index, seatCount);
  return {
    memberId: person.id,
    seat: seated ? String(assignment.seat_index) : assignment ? "Needs a seat" : "",
    name: formatPersonName(person),
    household: envelopeName(person.household_label, person.household_name),
    rsvp: rsvpLabel(person.rsvp_status),
    declined: person.rsvp_status === "declined",
  };
}

function compareSeated(a: TableExportPerson, b: TableExportPerson) {
  const aSeat = Number.parseInt(a.seat, 10);
  const bSeat = Number.parseInt(b.seat, 10);
  const aNum = Number.isInteger(aSeat);
  const bNum = Number.isInteger(bSeat);
  if (aNum && bNum) return aSeat - bSeat;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.name.localeCompare(b.name, "en-US", { sensitivity: "base" });
}
