"use client";

import Link from "next/link";
import type { RosterGuest, SeatingAssignment } from "./types";
import { formatGuestName } from "@/app/(app)/projects/[projectId]/guests/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type GuestRosterProps = {
  projectId: string;
  guests: RosterGuest[];
  assignmentByGuestId: Map<string, SeatingAssignment>;
  tableLabelById: Map<string, string>;
  selectedGuestId: string | null;
  hasTables: boolean;
  isPending: boolean;
  onSelectGuest: (guestId: string) => void;
  onUnassign: (assignmentId: string) => void;
};

export function GuestRoster({
  projectId,
  guests,
  assignmentByGuestId,
  tableLabelById,
  selectedGuestId,
  hasTables,
  isPending,
  onSelectGuest,
  onUnassign,
}: GuestRosterProps) {
  const unassigned = guests.filter((guest) => !assignmentByGuestId.has(guest.id));
  const assigned = guests.filter((guest) => assignmentByGuestId.has(guest.id));

  return (
    <Card className="w-full px-5 py-5">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Guests
      </p>

      {guests.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">
          No guests yet. Add them in the{" "}
          <Link
            href={`/projects/${projectId}/guests`}
            className="font-semibold text-accent underline underline-offset-2 hover:opacity-80"
          >
            Guests tab
          </Link>
          , then come back to seat them.
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-[12px] font-medium text-muted">
              Unassigned · {unassigned.length}
            </p>

            {!hasTables ? (
              <p className="mb-2 text-[12px] text-muted">
                Place a table on the floor plan first, then select a guest to
                seat them.
              </p>
            ) : null}

            {unassigned.length === 0 ? (
              <p className="text-[13px] text-muted">Everyone has a seat.</p>
            ) : (
              <ul className="space-y-1.5">
                {unassigned.map((guest) => {
                  const selected = selectedGuestId === guest.id;
                  return (
                    <li key={guest.id}>
                      <button
                        type="button"
                        onClick={() => onSelectGuest(guest.id)}
                        disabled={isPending || !hasTables}
                        aria-pressed={selected}
                        className={cn(
                          "w-full rounded-[var(--radius-inner)] px-3 py-2.5 text-left text-[14px] font-medium transition-colors",
                          selected
                            ? "bg-accent text-surface"
                            : "bg-well text-ink shadow-recessed hover:opacity-90",
                          (isPending || !hasTables) && "opacity-60",
                        )}
                      >
                        {formatGuestName(guest)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {assigned.length > 0 ? (
            <section>
              <p className="mb-2 text-[12px] font-medium text-muted">
                Seated · {assigned.length}
              </p>
              <ul className="space-y-1.5">
                {assigned.map((guest) => {
                  const assignment = assignmentByGuestId.get(guest.id)!;
                  const tableLabel =
                    tableLabelById.get(assignment.table_id) ?? "—";
                  return (
                    <li
                      key={guest.id}
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-well px-3 py-2.5 shadow-recessed"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                        {formatGuestName(guest)}
                        <span className="ml-1.5 text-[12px] font-normal text-muted">
                          {tableLabel}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onUnassign(assignment.id)}
                        disabled={isPending}
                        className={cn(
                          "shrink-0 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-semibold text-muted transition-colors hover:bg-surface hover:text-ink",
                          isPending && "opacity-60",
                        )}
                      >
                        Unassign
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Card>
  );
}
