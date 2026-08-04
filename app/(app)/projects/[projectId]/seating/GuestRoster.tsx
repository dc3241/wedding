"use client";

import Link from "next/link";
import type { RosterPerson, SeatingAssignment } from "./types";
import { formatPersonName, isAssignableRsvpStatus } from "./types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type GuestRosterProps = {
  projectId: string;
  people: RosterPerson[];
  assignmentByMemberId: Map<string, SeatingAssignment>;
  tableLabelById: Map<string, string>;
  selectedMemberId: string | null;
  pendingSeatLabel: string | null;
  hasTables: boolean;
  isPending: boolean;
  onSelectMember: (memberId: string) => void;
  onUnseat: (assignmentId: string) => void;
};

function RsvpDot({ status }: { status: RosterPerson["rsvp_status"] }) {
  const color =
    status === "attending"
      ? "bg-sage"
      : status === "declined"
        ? "bg-rosewood"
        : "bg-clay";

  return (
    <span
      className={cn("mt-1 size-2 shrink-0 rounded-[var(--radius-pill)]", color)}
      aria-label={status}
      title={status}
    />
  );
}

export function GuestRoster({
  projectId,
  people,
  assignmentByMemberId,
  tableLabelById,
  selectedMemberId,
  pendingSeatLabel,
  hasTables,
  isPending,
  onSelectMember,
  onUnseat,
}: GuestRosterProps) {
  // Unseated declined households are filtered out (SEAT-14). Seated declined
  // stay visible below with a rosewood flag + Unseat.
  const unassigned = people.filter(
    (person) =>
      !assignmentByMemberId.has(person.id) &&
      isAssignableRsvpStatus(person.rsvp_status),
  );
  const assigned = people.filter((person) =>
    assignmentByMemberId.has(person.id),
  );

  return (
    <Card className="w-full px-5 py-5">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Guests
      </p>

      {pendingSeatLabel ? (
        <p className="mb-3 text-[13px] font-medium text-accent">
          Seat {pendingSeatLabel} — pick a person below
        </p>
      ) : null}

      {people.length === 0 ? (
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
                Place a table on the floor plan first, then click a seat to
                place someone.
              </p>
            ) : null}

            {unassigned.length === 0 ? (
              <p className="text-[13px] text-muted">Everyone has a seat.</p>
            ) : (
              <ul className="space-y-1.5">
                {unassigned.map((person) => {
                  const selected = selectedMemberId === person.id;
                  const householdCue =
                    person.household_label?.trim() ||
                    person.household_name?.trim() ||
                    null;

                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMember(person.id)}
                        disabled={isPending || !hasTables}
                        aria-pressed={selected}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-[var(--radius-inner)] px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-accent text-surface"
                            : "bg-well text-ink shadow-recessed hover:opacity-90",
                          (isPending || !hasTables) && "opacity-60",
                        )}
                      >
                        <RsvpDot status={person.rsvp_status} />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium">
                            {formatPersonName(person)}
                          </span>
                          {householdCue ? (
                            <span
                              className={cn(
                                "block truncate text-[12px]",
                                selected ? "text-surface/80" : "text-muted",
                              )}
                            >
                              {householdCue}
                            </span>
                          ) : null}
                        </span>
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
                {assigned.map((person) => {
                  const assignment = assignmentByMemberId.get(person.id)!;
                  const declined = person.rsvp_status === "declined";
                  const tableLabel =
                    tableLabelById.get(assignment.table_id) ?? "—";
                  const seatLabel =
                    assignment.seat_index != null
                      ? ` · Seat ${assignment.seat_index}`
                      : " · needs a seat";
                  const householdCue =
                    person.household_label?.trim() ||
                    person.household_name?.trim() ||
                    null;

                  return (
                    <li
                      key={person.id}
                      className="flex items-start justify-between gap-2 rounded-[var(--radius-inner)] bg-well px-3 py-2.5 shadow-recessed"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <RsvpDot status={person.rsvp_status} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-ink">
                            {formatPersonName(person)}
                            {declined ? (
                              <span className="ml-1.5 text-[12px] font-semibold text-rosewood">
                                declined
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-[12px] text-muted">
                            {tableLabel}
                            {seatLabel}
                            {householdCue ? ` · ${householdCue}` : ""}
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUnseat(assignment.id)}
                        disabled={isPending}
                        className={cn(
                          "shrink-0 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-semibold text-rosewood transition-colors hover:bg-rosewood-wash",
                          isPending && "opacity-60",
                        )}
                      >
                        Unseat
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
