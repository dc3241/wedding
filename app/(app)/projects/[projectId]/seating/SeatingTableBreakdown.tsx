"use client";

import { formatGuestName } from "@/app/(app)/projects/[projectId]/guests/types";
import {
  seatingTableKindLabel,
  type RosterGuest,
  type SeatingTable,
} from "./types";
import { cn } from "@/lib/cn";

type SeatingTableBreakdownProps = {
  tables: SeatingTable[];
  guestsByTable: Record<string, RosterGuest[]>;
  occupancyByTable: Record<string, number>;
};

export function SeatingTableBreakdown({
  tables,
  guestsByTable,
  occupancyByTable,
}: SeatingTableBreakdownProps) {
  if (tables.length === 0) return null;

  return (
    <section>
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        By table
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => {
          const occupied = occupancyByTable[table.id] ?? 0;
          const seated = guestsByTable[table.id] ?? [];
          const full = occupied >= table.seat_count;
          const showKind = table.kind !== "standard";

          return (
            <article
              key={table.id}
              className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-raised"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">
                    {table.label}
                  </h3>
                  {showKind ? (
                    <p className="mt-0.5 text-[12px] font-medium text-muted">
                      {seatingTableKindLabel(table.kind)}
                    </p>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "shrink-0 text-[13px] font-medium tabular-nums",
                    full ? "text-sage" : "text-muted",
                  )}
                >
                  {occupied} / {table.seat_count}
                </p>
              </div>

              {seated.length === 0 ? (
                <div className="rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed">
                  <p className="text-[13px] text-muted">No one seated yet</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {seated.map((guest) => (
                    <li
                      key={guest.id}
                      className="break-words rounded-[var(--radius-inner)] bg-well px-3 py-2.5 text-[13px] font-medium leading-snug text-ink shadow-recessed"
                    >
                      {formatGuestName(guest)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
