"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { GuestPersonRow } from "./GuestRow";
import type { MealOption } from "./meal-types";
import {
  RSVP_STATUSES,
  type GuestPersonLine,
  type RsvpStatus,
} from "./types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { cn } from "@/lib/cn";
import type { ResolvedPartnerSides } from "@/lib/partner-sides";

const FILTER_OPTIONS: { value?: RsvpStatus; label: string }[] = [
  { label: "All" },
  ...RSVP_STATUSES.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
];

function guestsFilterHref(projectId: string, status?: RsvpStatus) {
  const base = `/projects/${projectId}/guests`;
  return status ? `${base}?status=${status}` : base;
}

type SortMode = "alphabetical" | "added";

function sortPeople(
  people: GuestPersonLine[],
  mode: SortMode,
): GuestPersonLine[] {
  if (mode === "added") return people;
  return [...people].sort((a, b) =>
    (a.member.name ?? "").localeCompare(b.member.name ?? "", "en-US", {
      sensitivity: "base",
    }),
  );
}

export function GuestPersonList({
  projectId,
  people,
  totalPeopleCount,
  statusFilter,
  mealOptions,
  mealSelectionActive,
  rowClass,
  partnerSides,
  emptyAction,
}: {
  projectId: string;
  people: GuestPersonLine[];
  totalPeopleCount: number;
  statusFilter?: RsvpStatus;
  mealOptions: MealOption[];
  mealSelectionActive: boolean;
  rowClass: string;
  partnerSides: ResolvedPartnerSides;
  emptyAction?: ReactNode;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
  const sortedPeople = sortPeople(people, sortMode);

  const count = statusFilter ? people.length : totalPeopleCount;
  const countNoun = count === 1 ? "person" : "people";

  return (
    <section id="guest-list" className="scroll-mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink md:text-[32px]">
              {count}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              {countNoun}
            </span>
          </p>
          <SegmentedToggle
            aria-label="Sort guest list"
            className="w-fit p-0.5"
          >
            <SegmentedToggleItem
              active={sortMode === "alphabetical"}
              aria-pressed={sortMode === "alphabetical"}
              onClick={() => setSortMode("alphabetical")}
              className="px-3 py-1 text-[12px] font-semibold"
            >
              Alphabetical
            </SegmentedToggleItem>
            <SegmentedToggleItem
              active={sortMode === "added"}
              aria-pressed={sortMode === "added"}
              onClick={() => setSortMode("added")}
              className="px-3 py-1 text-[12px] font-semibold"
            >
              Added order
            </SegmentedToggleItem>
          </SegmentedToggle>
        </div>
        <nav
          className="flex flex-wrap gap-2"
          aria-label="Filter by RSVP status"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = option.value === statusFilter;
            return (
              <Link
                key={option.label}
                href={guestsFilterHref(projectId, option.value)}
                className={cn(
                  "rounded-[var(--radius-pill)] px-3.5 py-2 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-accent text-surface"
                    : "bg-well text-muted hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {totalPeopleCount === 0 ? (
        <EmptyState action={emptyAction}>
          No guests yet. Add one above.
        </EmptyState>
      ) : people.length === 0 ? (
        <EmptyState>No guests match this filter.</EmptyState>
      ) : (
        <Card className="overflow-x-auto px-6 py-4">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                <th className="pb-3 pr-4 font-semibold">Name</th>
                <th className="pb-3 pr-4 font-semibold">Relationship</th>
                <th className="pb-3 pr-4 font-semibold">RSVP</th>
                {mealSelectionActive ? (
                  <th className="pb-3 pr-4 font-semibold">Meal</th>
                ) : null}
                <th className="pb-3 pr-4 font-semibold">Dietary</th>
                <th className="pb-3 text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPeople.map((person) => (
                <GuestPersonRow
                  key={person.member.id}
                  person={person}
                  mealOptions={mealOptions}
                  mealSelectionActive={mealSelectionActive}
                  rowClass={rowClass}
                  partnerSides={partnerSides}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
