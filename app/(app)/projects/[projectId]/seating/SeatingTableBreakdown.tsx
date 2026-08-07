"use client";

import { useState, useTransition } from "react";
import type { RefObject } from "react";
import type { RosterPerson, SeatingAssignment, SeatingTable } from "./types";
import { formatPersonName } from "./types";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

type SeatedPerson = RosterPerson & {
  assignment: SeatingAssignment;
};

type SeatChoice = number | "auto";

type OnAddMember = (
  tableId: string,
  memberId: string,
  seat: SeatChoice,
) => Promise<string | null>;

type SeatingTableBreakdownProps = {
  tables: SeatingTable[];
  peopleByTable: Record<string, SeatedPerson[]>;
  occupancyByTable: Record<string, number>;
  assignablePeople: RosterPerson[];
  isPending: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  onAddMember: OnAddMember;
  onUnseat: (assignmentId: string) => void;
};

function openSeatsForTable(
  seatCount: number,
  seated: SeatedPerson[],
): number[] {
  const occupied = new Set<number>();
  for (const person of seated) {
    const seat = person.assignment.seat_index;
    if (seat != null) occupied.add(seat);
  }

  const open: number[] = [];
  for (let seat = 1; seat <= seatCount; seat += 1) {
    if (!occupied.has(seat)) open.push(seat);
  }
  return open;
}

function parseSeatChoice(value: string): SeatChoice {
  if (value === "auto") return "auto";
  const seat = Number(value);
  if (Number.isInteger(seat) && seat >= 1) return seat;
  return "auto";
}

export function SeatingTableBreakdown({
  tables,
  peopleByTable,
  occupancyByTable,
  assignablePeople,
  isPending,
  sectionRef,
  onAddMember,
  onUnseat,
}: SeatingTableBreakdownProps) {
  if (tables.length === 0) return null;

  return (
    <section
      ref={sectionRef as RefObject<HTMLElement | null>}
      id="table-breakdown"
    >
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        By table
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <BreakdownTableCard
            key={table.id}
            table={table}
            seated={peopleByTable[table.id] ?? []}
            occupied={occupancyByTable[table.id] ?? 0}
            assignablePeople={assignablePeople}
            isPending={isPending}
            onAddMember={onAddMember}
            onUnseat={onUnseat}
          />
        ))}
      </div>
    </section>
  );
}

function BreakdownTableCard({
  table,
  seated,
  occupied,
  assignablePeople,
  isPending,
  onAddMember,
  onUnseat,
}: {
  table: SeatingTable;
  seated: SeatedPerson[];
  occupied: number;
  assignablePeople: RosterPerson[];
  isPending: boolean;
  onAddMember: OnAddMember;
  onUnseat: (assignmentId: string) => void;
}) {
  const [picked, setPicked] = useState("");
  const [seatPicked, setSeatPicked] = useState("auto");
  const [localError, setLocalError] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const over = occupied > table.seat_count;
  const full = occupied >= table.seat_count;
  const busy = isPending || adding;
  const openSeats = openSeatsForTable(table.seat_count, seated);
  const seatValue =
    seatPicked === "auto" || openSeats.some((seat) => String(seat) === seatPicked)
      ? seatPicked
      : "auto";
  const addDisabled = busy || assignablePeople.length === 0 || full;

  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-raised">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">
            {table.label}
          </h3>
        </div>
        <p
          className={cn(
            "shrink-0 text-[13px] font-medium tabular-nums",
            over ? "text-rosewood" : full ? "text-sage" : "text-muted",
          )}
        >
          {over
            ? `${occupied}/${table.seat_count} — over capacity`
            : `${occupied} / ${table.seat_count}`}
        </p>
      </div>

      {seated.length === 0 ? (
        <div className="mb-3 rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed">
          <p className="text-[13px] text-muted">No one seated yet</p>
        </div>
      ) : (
        <ul className="mb-3 flex flex-col gap-2">
          {seated.map((person) => {
            const declined = person.rsvp_status === "declined";
            return (
              <li
                key={person.id}
                className="flex items-start justify-between gap-2 break-words rounded-[var(--radius-inner)] bg-well px-3 py-2.5 shadow-recessed"
              >
                <span className="min-w-0 text-[13px] font-medium leading-snug text-ink">
                  {formatPersonName(person)}
                  <span className="ml-1.5 font-normal text-muted">
                    {person.assignment.seat_index != null
                      ? `Seat ${person.assignment.seat_index}`
                      : "needs a seat"}
                  </span>
                  {declined ? (
                    <span className="ml-1.5 font-semibold text-rosewood">
                      declined
                    </span>
                  ) : null}
                </span>
                {declined ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onUnseat(person.assignment.id)}
                    className={cn(
                      "shrink-0 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-semibold text-rosewood transition-colors hover:bg-rosewood-wash",
                      busy && "opacity-60",
                    )}
                  >
                    Unseat
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          ＋ Add guest
        </p>
        <div className="flex flex-col gap-2">
          <div>
            <label
              htmlFor={`breakdown-seat-${table.id}`}
              className="mb-1 block text-[13px] font-medium text-muted"
            >
              Seat
            </label>
            <Select
              id={`breakdown-seat-${table.id}`}
              value={seatValue}
              disabled={addDisabled}
              onChange={(event) => {
                setSeatPicked(event.target.value);
                setLocalError(null);
              }}
            >
              <option value="auto">Auto (lowest open)</option>
              {openSeats.map((seat) => (
                <option key={seat} value={String(seat)}>
                  Seat {seat}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor={`breakdown-add-${table.id}`}
              className="mb-1 block text-[13px] font-medium text-muted"
            >
              Person
            </label>
            <Select
              id={`breakdown-add-${table.id}`}
              value={picked}
              disabled={addDisabled}
              onChange={(event) => {
                const memberId = event.target.value;
                const seat = parseSeatChoice(seatValue);
                setPicked("");
                setSeatPicked("auto");
                setLocalError(null);
                if (!memberId) return;
                startAdd(async () => {
                  const error = await onAddMember(table.id, memberId, seat);
                  if (error) setLocalError(error);
                });
              }}
            >
              <option value="">
                {full
                  ? "Table is full"
                  : assignablePeople.length === 0
                    ? "No one to add"
                    : "Choose a person"}
              </option>
              {assignablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {formatPersonName(person)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {localError ? (
          <p className="mt-2 text-[13px] text-rosewood">{localError}</p>
        ) : null}
      </div>
    </article>
  );
}
