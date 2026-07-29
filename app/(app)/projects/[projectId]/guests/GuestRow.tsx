"use client";

import { useState, useTransition } from "react";
import {
  addGuestMember,
  deleteGuestMember,
  updateGuestMember,
} from "./guest-member-actions";
import { GuestRsvpQr } from "./GuestRsvpQr";
import { RsvpPill } from "./guest-rsvp";
import {
  guestDisplayHeadcount,
  type Guest,
  type GuestMember,
} from "./types";
import type { MealOption } from "./meal-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export function GuestRow({
  guest,
  mealOptions,
  mealSelectionActive,
  rowClass,
  siteSlug,
  showRsvpQr,
}: {
  guest: Guest;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
  rowClass: string;
  siteSlug: string | null;
  showRsvpQr: boolean;
}) {
  const [expanded, setExpanded] = useState(guest.members.length > 0);
  const headcount = guestDisplayHeadcount(guest);
  const overCap = guest.members.length > guest.party_size;

  return (
    <>
      <tr className={rowClass}>
        <td className="py-3 pr-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-left"
          >
            <div className="text-[15px] font-medium text-ink">{guest.full_name}</div>
            {guest.email ? (
              <div className="mt-0.5 text-[13px] text-muted">{guest.email}</div>
            ) : null}
          </button>
        </td>
        <td className="py-3 pr-4 text-[14px] text-muted">
          {guest.household ?? "—"}
        </td>
        <td className="py-3 pr-4 text-right">
          <div className="text-[14px] tabular-nums font-medium text-ink">
            {headcount}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            Invited: up to {guest.party_size}
          </div>
          {overCap ? (
            <div className="mt-0.5 text-[12px] text-clay">
              Members exceed invited cap
            </div>
          ) : null}
        </td>
        <td className="py-3 pr-4">
          <RsvpPill guestId={guest.id} status={guest.rsvp_status} />
        </td>
        <td className="py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-[13px] font-semibold text-accent hover:underline"
          >
            {expanded
              ? "Hide people"
              : guest.members.length > 0
                ? `${guest.members.length} people`
                : "Add people"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr>
          <td colSpan={5} className="pb-4">
            <div className="space-y-3">
              <GuestMembersPanel
                guest={guest}
                mealOptions={mealOptions}
                mealSelectionActive={mealSelectionActive}
              />
              {showRsvpQr ? (
                <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
                  <GuestRsvpQr
                    guestId={guest.id}
                    guestName={guest.full_name}
                    rsvpToken={guest.rsvp_token}
                    siteSlug={siteSlug}
                  />
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function GuestMembersPanel({
  guest,
  mealOptions,
  mealSelectionActive,
}: {
  guest: Guest;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
}) {
  const [isAddPending, startAddTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newMeal, setNewMeal] = useState("");
  const [newDietary, setNewDietary] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startAddTransition(async () => {
      await addGuestMember(guest.id, {
        name: newName,
        meal_option_id: mealSelectionActive ? newMeal || null : null,
        dietary_note: newDietary,
        attending: false,
        sort_order: guest.members.length,
      });
      setNewName("");
      setNewMeal("");
      setNewDietary("");
    });
  }

  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed space-y-3">
      {guest.members.length === 0 ? (
        <p className="text-[13px] text-muted">
          No people listed yet. Add each attending person for meal picks.
        </p>
      ) : (
        <ul className="space-y-2">
          {guest.members.map((member) => (
            <MemberEditor
              key={member.id}
              member={member}
              mealOptions={mealOptions}
              mealSelectionActive={mealSelectionActive}
            />
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className={cn(
          "grid gap-2 border-t border-hairline pt-3",
          mealSelectionActive
            ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
        )}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          disabled={isAddPending}
          className="bg-surface"
          aria-label="New member name"
        />
        {mealSelectionActive ? (
          <Select
            value={newMeal}
            onChange={(e) => setNewMeal(e.target.value)}
            disabled={isAddPending}
            aria-label="New member meal"
            className="bg-surface py-2 text-[14px]"
          >
            <option value="">No meal</option>
            {mealOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.is_kids ? `${option.name} (kids)` : option.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Input
          value={newDietary}
          onChange={(e) => setNewDietary(e.target.value)}
          placeholder="Dietary note"
          disabled={isAddPending}
          className="bg-surface"
          aria-label="New member dietary note"
        />
        <Button type="submit" variant="primary" disabled={isAddPending}>
          {isAddPending ? "Adding…" : "Add"}
        </Button>
      </form>
    </div>
  );
}

function MemberEditor({
  member,
  mealOptions,
  mealSelectionActive,
}: {
  member: GuestMember;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
}) {
  const [name, setName] = useState(member.name ?? "");
  const [meal, setMeal] = useState(member.meal_option_id ?? "");
  const [dietary, setDietary] = useState(member.dietary_note ?? "");
  const [attending, setAttending] = useState(member.attending);
  const [isPending, startTransition] = useTransition();

  function save(fields: {
    name?: string | null;
    meal_option_id?: string | null;
    dietary_note?: string | null;
    attending?: boolean;
  }) {
    startTransition(async () => {
      await updateGuestMember(member.id, fields);
    });
  }

  return (
    <li
      className={cn(
        "grid gap-2 rounded-[var(--radius-inner)] bg-surface p-3",
        mealSelectionActive
          ? "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
          : "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]",
        isPending && "opacity-60",
      )}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if ((member.name ?? "") !== name) {
            save({ name });
          }
        }}
        placeholder="Name"
        disabled={isPending}
        aria-label="Member name"
      />
      {mealSelectionActive ? (
        <Select
          value={meal}
          onChange={(e) => {
            const next = e.target.value;
            setMeal(next);
            save({ meal_option_id: next || null });
          }}
          disabled={isPending}
          aria-label="Member meal"
          className="py-2 text-[14px]"
        >
          <option value="">No meal</option>
          {mealOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.is_kids ? `${option.name} (kids)` : option.name}
            </option>
          ))}
        </Select>
      ) : null}
      <Input
        value={dietary}
        onChange={(e) => setDietary(e.target.value)}
        onBlur={() => {
          if ((member.dietary_note ?? "") !== dietary) {
            save({ dietary_note: dietary });
          }
        }}
        placeholder="Dietary note"
        disabled={isPending}
        aria-label="Member dietary note"
      />
      <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <input
          type="checkbox"
          checked={attending}
          onChange={(e) => {
            const next = e.target.checked;
            setAttending(next);
            save({ attending: next });
          }}
          disabled={isPending}
          className="size-4 rounded border-ring text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        Attending
      </label>
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteGuestMember(member.id);
          });
        }}
        className="text-muted hover:text-rosewood"
      >
        Delete
      </Button>
    </li>
  );
}
