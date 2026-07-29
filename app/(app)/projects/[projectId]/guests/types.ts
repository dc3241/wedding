export type RsvpStatus = "pending" | "attending" | "declined";

export type GuestMember = {
  id: string;
  project_id: string;
  guest_id: string;
  name: string | null;
  meal_option_id: string | null;
  meal_name: string | null;
  dietary_note: string | null;
  attending: boolean;
  sort_order: number;
  created_at: string;
};

export type Guest = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  household: string | null;
  party_size: number;
  rsvp_status: RsvpStatus;
  rsvp_token: string;
  notes: string | null;
  members: GuestMember[];
};

export const RSVP_STATUSES: RsvpStatus[] = ["pending", "attending", "declined"];

// Guests store a single `full_name` (see 0006). Format tolerantly: trim, and
// fall back rather than ever surfacing an empty string / "null". Shared so the
// roster, table guest-lists, and later seat labels all render names the same.
export function formatGuestName(guest: { full_name: string | null }): string {
  const name = guest.full_name?.trim();
  return name ? name : "Unnamed guest";
}

/** Invited cap — sum of authored party_size. Never derived from members. */
export function sumInvitedCap(guests: Pick<Guest, "party_size">[]) {
  return guests.reduce((sum, guest) => sum + guest.party_size, 0);
}

/**
 * Responded headcount for a status. When a guest has members and is attending,
 * count attending members; otherwise fall back to party_size (invited cap) for
 * that status. Match/apply should create members from the RSVP'd headcount so
 * Attending reflects people, not the invite cap.
 */
export function sumRespondedHeadcount(
  guests: Array<
    Pick<Guest, "party_size" | "rsvp_status"> & {
      members?: GuestMember[];
    }
  >,
  status: RsvpStatus,
) {
  return guests
    .filter((guest) => guest.rsvp_status === status)
    .reduce((sum, guest) => {
      const members = guest.members ?? [];
      if (members.length > 0) {
        if (status === "attending") {
          return sum + members.filter((m) => m.attending).length;
        }
        return sum + members.length;
      }
      return sum + guest.party_size;
    }, 0);
}

/** Per-guest display headcount: attending members if any, else party_size. */
export function guestDisplayHeadcount(
  guest: Pick<Guest, "party_size"> & { members?: GuestMember[] },
) {
  const members = guest.members ?? [];
  if (members.length > 0) {
    return members.filter((m) => m.attending).length;
  }
  return guest.party_size;
}

/** @deprecated Use sumInvitedCap — party_size is the invited cap. */
export function sumPartySize(guests: Pick<Guest, "party_size">[]) {
  return sumInvitedCap(guests);
}

/** @deprecated Use sumRespondedHeadcount. */
export function sumPartySizeByStatus(
  guests: Array<
    Pick<Guest, "party_size" | "rsvp_status"> & {
      members?: GuestMember[];
    }
  >,
  status: RsvpStatus,
) {
  return sumRespondedHeadcount(guests, status);
}
