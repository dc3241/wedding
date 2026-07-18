"use client";

import { useTransition } from "react";
import { updateMeal } from "./actions";
import { RsvpPill } from "./guest-rsvp";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { MEAL_OPTIONS, type Guest } from "./types";

export function GuestRow({
  guest,
  rowClass,
}: {
  guest: Guest;
  rowClass: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleMealChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const choice = e.target.value;
    startTransition(async () => {
      await updateMeal(guest.id, choice);
    });
  }

  return (
    <tr className={cn(isPending && "opacity-60", rowClass)}>
      <td className="py-3 pr-4">
        <div className="text-[15px] font-medium text-ink">{guest.full_name}</div>
        {guest.email ? (
          <div className="mt-0.5 text-[13px] text-muted">{guest.email}</div>
        ) : null}
      </td>
      <td className="py-3 pr-4 text-[14px] text-muted">
        {guest.household ?? "—"}
      </td>
      <td className="py-3 pr-4 text-right text-[14px] tabular-nums text-ink">
        {guest.party_size}
      </td>
      <td className="py-3 pr-4">
        <RsvpPill guestId={guest.id} status={guest.rsvp_status} />
      </td>
      <td className="py-3">
        <Select
          value={guest.meal_choice ?? ""}
          onChange={handleMealChange}
          disabled={isPending}
          aria-label={`Meal choice for ${guest.full_name}`}
          className="min-w-[8.5rem] py-1.5 text-[14px]"
        >
          {MEAL_OPTIONS.map((option) => (
            <option key={option.value || "none"} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </td>
    </tr>
  );
}
