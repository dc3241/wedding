import type { Guest, GuestPersonLine } from "@/app/(app)/projects/[projectId]/guests/types";
import type { CatererMealTally } from "@/lib/caterer-tally";
import type {
  GuestListCsvRow,
  MailingCsvRow,
} from "@/lib/guest-exports/csv";
import {
  envelopeName,
  formatRelationship,
  joinPeopleNames,
  rsvpLabel,
} from "@/lib/guest-exports/format";
import type { ResolvedPartnerSides } from "@/lib/partner-sides";

export type MailingHousehold = MailingCsvRow & {
  guestId: string;
  hasAddress: boolean;
};

export function buildMailingHouseholds(guests: Guest[]): MailingHousehold[] {
  const rows = guests.map((guest) => {
    const members = [...guest.members].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.created_at.localeCompare(b.created_at);
    });
    const address = guest.address?.trim() ?? "";
    return {
      guestId: guest.id,
      envelopeName: envelopeName(guest.household, guest.full_name),
      people: joinPeopleNames(members.map((member) => member.name)),
      address,
      phone: guest.phone?.trim() ?? "",
      rsvp: rsvpLabel(guest.rsvp_status),
      partySize: String(guest.party_size),
      hasAddress: address.length > 0,
    };
  });

  rows.sort((a, b) =>
    a.envelopeName.localeCompare(b.envelopeName, "en-US", {
      sensitivity: "base",
    }),
  );
  return rows;
}

export function mailingAddressGap(households: MailingHousehold[]): {
  missing: number;
  total: number;
} {
  return {
    missing: households.filter((row) => !row.hasAddress).length,
    total: households.length,
  };
}

export function buildGuestListRows(
  people: GuestPersonLine[],
  partnerSides: ResolvedPartnerSides,
): GuestListCsvRow[] {
  const rows = people.map((person) => ({
    name: person.member.name?.trim() || "Unnamed guest",
    household: envelopeName(person.householdLabel, person.householdFullName),
    rsvp: rsvpLabel(person.rsvp_status),
    meal: person.member.meal_name?.trim() || "",
    dietary: person.member.dietary_note?.trim() || "",
    relationship: formatRelationship(person.member, partnerSides),
  }));

  rows.sort((a, b) =>
    a.name.localeCompare(b.name, "en-US", { sensitivity: "base" }),
  );
  return rows;
}

export function guestListFooter(peopleCount: number, tally: CatererMealTally[]) {
  const tallyLabel =
    tally.length === 0
      ? null
      : tally.map((row) => `${row.count} ${row.label}`).join(" · ");
  const noun = peopleCount === 1 ? "person" : "people";
  return {
    peopleLabel: `${peopleCount} ${noun}`,
    tallyLabel,
  };
}
