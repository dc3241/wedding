"use client";

import { useState, useTransition } from "react";
import { removeGuest } from "./actions";
import { deleteGuestMember, updateGuestMember } from "./guest-member-actions";
import { RsvpSelect } from "./guest-rsvp";
import type { GuestPersonLine } from "./types";
import type { MealOption } from "./meal-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  labelForPartnerSide,
  type ResolvedPartnerSides,
} from "@/lib/partner-sides";

export function GuestPersonRow({
  person,
  mealOptions,
  mealSelectionActive,
  rowClass,
  partnerSides,
}: {
  person: GuestPersonLine;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
  rowClass: string;
  partnerSides: ResolvedPartnerSides;
}) {
  const member = person.member;
  const [name, setName] = useState(member.name ?? "");
  const [meal, setMeal] = useState(member.meal_option_id ?? "");
  const [dietary, setDietary] = useState(member.dietary_note ?? "");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const relationshipLabel = member.relationship?.trim() || null;
  const partnerLabel = labelForPartnerSide(
    partnerSides,
    member.relationship_side,
  );
  const relationshipText =
    relationshipLabel && partnerLabel
      ? `${relationshipLabel} of ${partnerLabel}`
      : relationshipLabel;

  const primaryName = person.relatedToPrimaryName?.trim() || null;
  const associationSublabel =
    primaryName == null
      ? null
      : member.member_type === "child"
        ? `${primaryName}'s child`
        : `${primaryName}'s Guest`;

  function save(fields: {
    name?: string | null;
    meal_option_id?: string | null;
    dietary_note?: string | null;
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
        {associationSublabel ? (
          <div className="mt-1 text-[13px] text-muted">{associationSublabel}</div>
        ) : null}
        {person.isFirstInHousehold && person.phone ? (
          <div className="mt-1 text-[13px] text-muted">{person.phone}</div>
        ) : null}
      </td>
      <td className="py-3 pr-4 align-top">
        {relationshipText ? (
          <span className="text-[14px] font-medium text-ink">
            {relationshipText}
          </span>
        ) : (
          <span className="text-[14px] text-muted">Add relationship</span>
        )}
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
