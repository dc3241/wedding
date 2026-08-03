"use client";

import { useState, useTransition } from "react";
import { removeGuest } from "./actions";
import { deleteGuestMember, updateGuestMember } from "./guest-member-actions";
import { GuestRsvpQr } from "./GuestRsvpQr";
import { RsvpSelect } from "./guest-rsvp";
import type { GuestPersonLine } from "./types";
import type { MealOption } from "./meal-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { GUEST_RELATIONSHIPS } from "@/lib/guest-relationships";
import type { ResolvedPartnerSides } from "@/lib/partner-sides";

export function GuestPersonRow({
  person,
  mealOptions,
  mealSelectionActive,
  rowClass,
  siteSlug,
  showRsvpQr,
  partnerSides,
}: {
  person: GuestPersonLine;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
  rowClass: string;
  siteSlug: string | null;
  showRsvpQr: boolean;
  partnerSides: ResolvedPartnerSides;
}) {
  const member = person.member;
  const [name, setName] = useState(member.name ?? "");
  const [meal, setMeal] = useState(member.meal_option_id ?? "");
  const [dietary, setDietary] = useState(member.dietary_note ?? "");
  const [attending, setAttending] = useState(member.attending);
  const [side, setSide] = useState(member.relationship_side ?? "");
  const [relationship, setRelationship] = useState(member.relationship ?? "");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const householdCue =
    person.householdLabel?.trim() || person.householdFullName;
  const addressCue = person.address?.trim() || null;

  function save(fields: {
    name?: string | null;
    meal_option_id?: string | null;
    dietary_note?: string | null;
    attending?: boolean;
    relationship_side?: string | null;
    relationship?: string | null;
  }) {
    startTransition(async () => {
      await updateGuestMember(member.id, fields);
    });
  }

  function handleDeletePerson() {
    const label = (member.name ?? "").trim() || "this person";
    const lastInHousehold = person.householdMemberCount <= 1;
    const confirmMsg = lastInHousehold
      ? `Delete “${label}” and their household from the guest list? This cannot be undone.`
      : `Remove “${label}” from the household? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    startDeleteTransition(async () => {
      if (lastInHousehold) {
        await removeGuest(person.guestId);
      } else {
        await deleteGuestMember(member.id);
      }
    });
  }

  return (
    <tr className={cn(rowClass, (isPending || isDeleting) && "opacity-60")}>
      <td className="py-3 pr-4 align-top">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if ((member.name ?? "") !== name) {
              save({ name });
            }
          }}
          placeholder="Name"
          disabled={isPending || isDeleting}
          aria-label="Guest name"
          className="bg-surface text-[15px] font-medium"
        />
        {person.isFirstInHousehold && person.phone ? (
          <div className="mt-1 text-[13px] text-muted">{person.phone}</div>
        ) : null}
        {showRsvpQr && person.isFirstInHousehold ? (
          <div className="mt-2">
            <GuestRsvpQr
              guestId={person.guestId}
              guestName={person.householdFullName}
              rsvpToken={person.rsvp_token}
              siteSlug={siteSlug}
            />
          </div>
        ) : null}
      </td>
      <td className="py-3 pr-4 align-top">
        <span className="text-[13px] text-muted">{householdCue}</span>
        {person.isFirstInHousehold && addressCue ? (
          <div className="mt-1 text-[13px] text-muted">{addressCue}</div>
        ) : null}
      </td>
      <td className="py-3 pr-4 align-top">
        <div className="flex min-w-[11rem] flex-col gap-2">
          <Select
            value={side}
            onChange={(e) => {
              const next = e.target.value;
              setSide(next);
              save({ relationship_side: next || null });
            }}
            disabled={isPending || isDeleting}
            aria-label="Relationship to"
            className="bg-surface py-2 text-[14px]"
          >
            <option value="">Side…</option>
            {partnerSides.options.map((option) => (
              <option key={option.token} value={option.token}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={relationship}
            onChange={(e) => {
              const next = e.target.value;
              setRelationship(next);
              save({ relationship: next || null });
            }}
            disabled={isPending || isDeleting}
            aria-label="Relationship"
            className="bg-surface py-2 text-[14px]"
          >
            <option value="">Relationship…</option>
            {GUEST_RELATIONSHIPS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </td>
      <td className="py-3 pr-4 align-top">
        <RsvpSelect guestId={person.guestId} status={person.rsvp_status} />
      </td>
      {mealSelectionActive ? (
        <td className="py-3 pr-4 align-top">
          <Select
            value={meal}
            onChange={(e) => {
              const next = e.target.value;
              setMeal(next);
              save({ meal_option_id: next || null });
            }}
            disabled={isPending || isDeleting}
            aria-label="Meal"
            className="bg-surface py-2 text-[14px]"
          >
            <option value="">No meal</option>
            {mealOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.is_kids ? `${option.name} (kids)` : option.name}
              </option>
            ))}
          </Select>
        </td>
      ) : null}
      <td className="py-3 pr-4 align-top">
        <Input
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
          onBlur={() => {
            if ((member.dietary_note ?? "") !== dietary) {
              save({ dietary_note: dietary });
            }
          }}
          placeholder="Dietary note"
          disabled={isPending || isDeleting}
          aria-label="Dietary note"
          className="bg-surface"
        />
      </td>
      <td className="py-3 pr-4 align-top">
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <input
            type="checkbox"
            checked={attending}
            onChange={(e) => {
              const next = e.target.checked;
              setAttending(next);
              save({ attending: next });
            }}
            disabled={isPending || isDeleting}
            className="size-4 rounded border-ring text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          Attending
        </label>
      </td>
      <td className="py-3 text-right align-top">
        <Button
          type="button"
          variant="ghost"
          disabled={isDeleting}
          onClick={handleDeletePerson}
          className="text-muted hover:text-rosewood"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
      </td>
    </tr>
  );
}
