"use client";

import Link from "next/link";
import type { RosterGuest, SeatingAssignment } from "./types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatGuestName } from "@/app/(app)/projects/[projectId]/guests/types";
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
    <aside className="w-full shrink-0 rounded-lg border border-stone bg-surface p-4 lg:w-64">
      <Eyebrow className="mb-3 block">Guests</Eyebrow>

      {guests.length === 0 ? (
        <p className="text-[13px] text-ink-muted">
          No guests yet. Add them in the{" "}
          <Link
            href={`/projects/${projectId}/guests`}
            className="text-plum underline underline-offset-2 hover:text-plum-deep"
          >
            Guests tab
          </Link>
          , then come back to seat them.
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-[12px] font-medium text-ink-muted">
              Unassigned · {unassigned.length}
            </p>

            {!hasTables ? (
              <p className="mb-2 text-[12px] text-ink-muted">
                Place a table on the floor plan first, then select a guest to seat them.
              </p>
            ) : null}

            {unassigned.length === 0 ? (
              <p className="text-[13px] text-ink-muted">Everyone has a seat.</p>
            ) : (
              <ul className="space-y-1">
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
                          "w-full rounded border px-3 py-2 text-left text-[14px] transition-colors",
                          selected
                            ? "border-plum bg-plum-tint text-plum-deep"
                            : "border-stone bg-surface text-ink hover:border-ink-muted",
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
              <p className="mb-2 text-[12px] font-medium text-ink-muted">
                Seated · {assigned.length}
              </p>
              <ul className="space-y-1">
                {assigned.map((guest) => {
                  const assignment = assignmentByGuestId.get(guest.id)!;
                  const tableLabel = tableLabelById.get(assignment.table_id) ?? "—";
                  return (
                    <li
                      key={guest.id}
                      className="flex items-center justify-between gap-2 rounded border border-stone bg-surface px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
                        {formatGuestName(guest)}
                        <span className="ml-1.5 text-[12px] text-ink-muted">
                          {tableLabel}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onUnassign(assignment.id)}
                        disabled={isPending}
                        className={cn(
                          "shrink-0 rounded border border-transparent px-2 py-1 text-[12px] text-ink-muted transition-colors hover:border-stone hover:bg-stone-soft hover:text-ink",
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
    </aside>
  );
}
