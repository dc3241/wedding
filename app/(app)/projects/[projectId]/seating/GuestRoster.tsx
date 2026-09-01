"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { RosterPerson, SeatingAssignment } from "./types";
import { formatPersonName, isAssignableRsvpStatus } from "./types";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
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

function personMatchesQuery(
  person: RosterPerson,
  query: string,
  assignment: SeatingAssignment | undefined,
  tableLabelById: Map<string, string>,
) {
  if (!query) return true;

  const tableLabel = assignment
    ? (tableLabelById.get(assignment.table_id) ?? "")
    : "";
  const seat =
    assignment?.seat_index != null ? `seat ${assignment.seat_index}` : "";
  const haystack = [
    formatPersonName(person),
    person.name,
    person.household_name,
    person.household_label,
    person.relationship,
    tableLabel,
    seat,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
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
  const searchId = useId();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  // Unseated declined households are filtered out (SEAT-14). Seated declined
  // stay visible below with a rosewood flag + Unseat.
  const unassigned = useMemo(
    () =>
      people.filter(
        (person) =>
          !assignmentByMemberId.has(person.id) &&
          isAssignableRsvpStatus(person.rsvp_status),
      ),
    [assignmentByMemberId, people],
  );
  const assigned = useMemo(
    () => people.filter((person) => assignmentByMemberId.has(person.id)),
    [assignmentByMemberId, people],
  );

  const visibleUnassigned = useMemo(
    () =>
      unassigned.filter((person) =>
        personMatchesQuery(person, normalizedQuery, undefined, tableLabelById),
      ),
    [normalizedQuery, tableLabelById, unassigned],
  );
  const visibleAssigned = useMemo(
    () =>
      assigned.filter((person) =>
        personMatchesQuery(
          person,
          normalizedQuery,
          assignmentByMemberId.get(person.id),
          tableLabelById,
        ),
      ),
    [assigned, assignmentByMemberId, normalizedQuery, tableLabelById],
  );

  const filtering = normalizedQuery.length > 0;
  const noMatches =
    filtering &&
    visibleUnassigned.length === 0 &&
    visibleAssigned.length === 0;

  return (
    <Card
      data-tour="seating-assign"
      className="flex max-h-[min(28rem,65vh)] w-full min-h-0 flex-col overflow-hidden px-5 py-5 lg:max-h-[calc(100dvh-5.5rem)]"
    >
      <CollapseSection
        defaultOpen
        className="flex min-h-0 flex-1 flex-col"
        headerClassName="shrink-0"
        title={
          <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Guests
          </span>
        }
        bodyClassName="mt-3 flex min-h-0 flex-1 flex-col"
      >
        {pendingSeatLabel ? (
          <p className="mb-3 shrink-0 text-[13px] font-medium text-accent">
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
          <>
            <label
              htmlFor={searchId}
              className="mb-3 flex shrink-0 items-center gap-2 rounded-[var(--radius-inner)] bg-well px-3 py-2 shadow-recessed"
            >
              <svg
                aria-hidden
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="shrink-0 text-muted"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="sr-only">Find a guest</span>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a guest…"
                autoComplete="off"
                className="w-full border-none bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-muted"
              />
            </label>

            <div
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain"
              aria-live="polite"
            >
              {noMatches ? (
                <p className="text-[13px] text-muted">
                  No guests match “{query.trim()}”.
                </p>
              ) : (
                <>
                  <section>
                    <p className="mb-2 text-[12px] font-medium text-muted">
                      Unassigned ·{" "}
                      {filtering
                        ? `${visibleUnassigned.length} of ${unassigned.length}`
                        : unassigned.length}
                    </p>

                    {!hasTables ? (
                      <p className="mb-2 text-[12px] text-muted">
                        Place a table on the floor plan first, then click a seat
                        to place someone.
                      </p>
                    ) : null}

                    {unassigned.length === 0 ? (
                      <p className="text-[13px] text-muted">
                        Everyone has a seat.
                      </p>
                    ) : visibleUnassigned.length === 0 ? (
                      <p className="text-[13px] text-muted">
                        No unassigned guests match.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {visibleUnassigned.map((person) => {
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
                                        selected
                                          ? "text-surface/80"
                                          : "text-muted",
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
                        Seated ·{" "}
                        {filtering
                          ? `${visibleAssigned.length} of ${assigned.length}`
                          : assigned.length}
                      </p>
                      {visibleAssigned.length === 0 ? (
                        <p className="text-[13px] text-muted">
                          No seated guests match.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {visibleAssigned.map((person) => {
                            const assignment = assignmentByMemberId.get(
                              person.id,
                            )!;
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
                                      {householdCue
                                        ? ` · ${householdCue}`
                                        : ""}
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
                      )}
                    </section>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </CollapseSection>
    </Card>
  );
}
