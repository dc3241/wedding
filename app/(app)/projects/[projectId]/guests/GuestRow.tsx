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

export function guestListGridClass(mealSelectionActive: boolean) {
  return mealSelectionActive
    ? "md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(8.25rem,0.7fr)_minmax(8.25rem,0.7fr)_minmax(0,1fr)_auto]"
    : "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(8.25rem,0.7fr)_minmax(0,1fr)_auto]";
}

function MobileLabel({ children }: { children: string }) {
  return (
    <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted md:hidden">
      {children}
    </span>
  );
}

export function GuestPersonRow({
  person,
  mealOptions,
  mealSelectionActive,
  gridClass,
  partnerSides,
  tourRsvpAnchor = false,
}: {
  person: GuestPersonLine;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
  gridClass: string;
  partnerSides: ResolvedPartnerSides;
  tourRsvpAnchor?: boolean;
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
    <li
      className={cn(
        "rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed",
        "md:grid md:items-start md:gap-x-4 md:rounded-none md:border-b md:border-hairline md:bg-transparent md:px-0 md:py-3 md:shadow-none md:last:border-b-0",
        gridClass,
        (isPending || isDeleting) && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <MobileLabel>Name</MobileLabel>
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
          className="min-w-0 bg-surface text-[15px] font-medium"
        />
        {associationSublabel ? (
          <div className="mt-1 text-[13px] text-muted">
            {associationSublabel}
          </div>
        ) : null}
        {person.isFirstInHousehold && person.phone ? (
          <div className="mt-1 text-[13px] text-muted">{person.phone}</div>
        ) : null}
        {relationshipText ? (
          <p className="mt-1 text-[13px] font-medium text-muted md:hidden">
            {relationshipText}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "hidden min-w-0 md:block",
          !relationshipText && "md:invisible",
        )}
      >
        {relationshipText ? (
          <span className="text-[14px] font-medium leading-snug text-ink">
            {relationshipText}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-3 grid gap-3 md:mt-0 md:contents",
          mealSelectionActive ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <div
          className="min-w-0"
          data-tour={tourRsvpAnchor ? "guests-rsvp" : undefined}
        >
          <MobileLabel>RSVP</MobileLabel>
          <RsvpSelect
            guestId={person.guestId}
            status={person.rsvp_status}
            className="min-w-0"
          />
        </div>

        {mealSelectionActive ? (
          <div
            className="min-w-0"
            data-tour={tourRsvpAnchor ? "guests-meal" : undefined}
          >
            <MobileLabel>Meal</MobileLabel>
            <Select
              value={meal}
              onChange={(e) => {
                const next = e.target.value;
                setMeal(next);
                save({ meal_option_id: next || null });
              }}
              disabled={isPending || isDeleting}
              aria-label="Meal"
              className="min-w-0 bg-surface py-2 text-[14px]"
            >
              <option value="">No meal</option>
              {mealOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.is_kids ? `${option.name} (kids)` : option.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-w-0 md:mt-0">
        <MobileLabel>Dietary</MobileLabel>
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
          className="min-w-0 bg-surface"
        />
      </div>

      <div className="mt-2 flex justify-end md:mt-0 md:justify-self-end">
        <Button
          type="button"
          variant="ghost"
          disabled={isDeleting}
          onClick={handleDeletePerson}
          className="text-muted !px-3 !py-2 text-[13px] hover:text-rosewood"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </li>
  );
}
