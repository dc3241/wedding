export type RsvpStatus = "pending" | "attending" | "declined";

export type Guest = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  household: string | null;
  party_size: number;
  rsvp_status: RsvpStatus;
  meal_choice: string | null;
  notes: string | null;
};

export const RSVP_STATUSES: RsvpStatus[] = ["pending", "attending", "declined"];

// Guests store a single `full_name` (see 0006). Format tolerantly: trim, and
// fall back rather than ever surfacing an empty string / "null". Shared so the
// roster, table guest-lists, and later seat labels all render names the same.
export function formatGuestName(guest: { full_name: string | null }): string {
  const name = guest.full_name?.trim();
  return name ? name : "Unnamed guest";
}

export const MEAL_OPTIONS = [
  { value: "", label: "—" },
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "fish", label: "Fish" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
] as const;

export function sumPartySize(guests: Guest[]) {
  return guests.reduce((sum, guest) => sum + guest.party_size, 0);
}

export function sumPartySizeByStatus(guests: Guest[], status: RsvpStatus) {
  return guests
    .filter((guest) => guest.rsvp_status === status)
    .reduce((sum, guest) => sum + guest.party_size, 0);
}
