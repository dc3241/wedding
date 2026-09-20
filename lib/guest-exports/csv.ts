export type GuestExportKind = "mailing" | "guests" | "tables";

export type MailingCsvRow = {
  envelopeName: string;
  people: string;
  address: string;
  phone: string;
  rsvp: string;
  partySize: string;
};

export type GuestListCsvRow = {
  name: string;
  household: string;
  rsvp: string;
  meal: string;
  dietary: string;
  relationship: string;
};

export type TableAssignmentCsvRow = {
  table: string;
  seat: string;
  name: string;
  household: string;
  rsvp: string;
};

export function guestExportFilename(
  kind: GuestExportKind,
  projectName: string,
  slugFor: (name: string) => string,
): string {
  const slug = slugFor(projectName);
  if (kind === "mailing") return `${slug}-mailing.csv`;
  if (kind === "guests") return `${slug}-guests.csv`;
  return `${slug}-table-assignments.csv`;
}

export function buildMailingCsv(rows: MailingCsvRow[]): string {
  return toCsv(
    ["Envelope name", "People", "Address", "Phone", "RSVP", "Party size"],
    rows.map((row) => [
      row.envelopeName,
      row.people,
      row.address,
      row.phone,
      row.rsvp,
      row.partySize,
    ]),
  );
}

export function buildGuestListCsv(rows: GuestListCsvRow[]): string {
  return toCsv(
    ["Name", "Household", "RSVP", "Meal", "Dietary", "Relationship"],
    rows.map((row) => [
      row.name,
      row.household,
      row.rsvp,
      row.meal,
      row.dietary,
      row.relationship,
    ]),
  );
}

export function buildTableAssignmentCsv(rows: TableAssignmentCsvRow[]): string {
  return toCsv(
    ["Table", "Seat", "Name", "Household", "RSVP"],
    rows.map((row) => [
      row.table,
      row.seat,
      row.name,
      row.household,
      row.rsvp,
    ]),
  );
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
