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
