"use client";

import { useMemo, useState } from "react";
import type { RosterPerson, SeatingAssignment } from "./types";
import { formatPersonName, isAssignableRsvpStatus } from "./types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type SeatMenuTarget = {
  assignmentId: string;
  tableId: string;
  seatIndex: number | null;
  memberId: string;
};

type SeatActionMenuProps = {
  target: SeatMenuTarget;
  people: RosterPerson[];
  assignmentByMemberId: Map<string, SeatingAssignment>;
  isPending: boolean;
  confirmation: string | null;
  onMove: () => void;
  onSwapOrReplace: (otherMemberId: string) => void;
  onUnseat: () => void;
  onClose: () => void;
};

export function SeatActionMenu({
  target,
  people,
  assignmentByMemberId,
  isPending,
  confirmation,
  onMove,
  onSwapOrReplace,
  onUnseat,
  onClose,
}: SeatActionMenuProps) {
  const [picked, setPicked] = useState("");

  const person = people.find((row) => row.id === target.memberId);
  const eligible = useMemo(
    () =>
      people.filter((row) => {
        if (row.id === target.memberId) return false;
        const other = assignmentByMemberId.get(row.id);
        // Seated people stay eligible for swap; unassigned declined are filtered.
        if (other) return true;
        return isAssignableRsvpStatus(row.rsvp_status);
      }),
    [assignmentByMemberId, people, target.memberId],
  );

  const seatLabel =
    target.seatIndex != null ? `Seat ${target.seatIndex}` : "Needs a seat";

  return (
    <div className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-raised">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {seatLabel}
          </p>
          <p className="truncate text-[15px] font-semibold text-ink">
            {person ? formatPersonName(person) : "Seated guest"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-semibold text-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={onMove}
        >
          Move to another seat
        </Button>

        <div>
          <label
            htmlFor="seat-swap-replace"
            className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
          >
            Swap or replace with…
          </label>
          <div className="flex gap-2">
            <Select
              id="seat-swap-replace"
              value={picked}
              disabled={isPending || eligible.length === 0}
              onChange={(event) => setPicked(event.target.value)}
              className="min-w-0 flex-1"
            >
              <option value="">Choose a person</option>
              {eligible.map((row) => {
                const other = assignmentByMemberId.get(row.id);
                const cue = other
                  ? other.seat_index != null
                    ? ` · Seat ${other.seat_index}`
                    : " · seated"
                  : " · unassigned";
                return (
                  <option key={row.id} value={row.id}>
                    {formatPersonName(row)}
                    {cue}
                  </option>
                );
              })}
            </Select>
            <Button
              type="button"
              variant="default"
              disabled={isPending || !picked}
              onClick={() => {
                if (!picked) return;
                onSwapOrReplace(picked);
              }}
            >
              Apply
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={onUnseat}
          className="border-rosewood text-rosewood hover:border-rosewood hover:text-rosewood"
        >
          Unseat
        </Button>

        {confirmation ? (
          <p className={cn("text-[13px] font-medium text-sage")}>
            {confirmation}
          </p>
        ) : null}
      </div>
    </div>
  );
}
