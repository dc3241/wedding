"use client";

import Link from "next/link";
import { useState } from "react";
import { AddEventForm } from "./AddEventForm";
import { TimelineEventRow } from "./TimelineEventRow";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import {
  formatDurationMinutes,
  type TimelineAggregates,
  type TimelineAnnotatedEvent,
  type TimelineSectionGroup,
} from "@/lib/timeline-aggregates";
import { cn } from "@/lib/cn";

type TimelineBoardProps = {
  projectId: string;
  aggregates: TimelineAggregates;
};

function runSheetHref(projectId: string, owner: string | null) {
  const base = `/projects/${projectId}/timeline/run-sheet`;
  if (!owner) return base;
  return `${base}?owner=${encodeURIComponent(owner)}`;
}

function DaySummaryStrip({ aggregates }: { aggregates: TimelineAggregates }) {
  const {
    daySpanLabel,
    total,
    scheduledDurationLabel,
    conflictCount,
    gapCount,
  } = aggregates;

  return (
    <Card className="overflow-hidden px-5 py-4 sm:px-6 sm:py-5">
      <div className="border-l-2 border-plum pl-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px]">
          <span className="tabular-nums text-ink">
            {daySpanLabel ?? "No start times"}
          </span>
          <span className="text-ink-muted">·</span>
          <span className="tabular-nums text-ink-muted">
            {total} {total === 1 ? "event" : "events"}
          </span>
          <span className="text-ink-muted">·</span>
          <span className="tabular-nums text-ink-muted">
            {scheduledDurationLabel === "—"
              ? "No scheduled duration"
              : `${scheduledDurationLabel} scheduled`}
          </span>
        </div>

        {(conflictCount > 0 || gapCount > 0) && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {conflictCount > 0 ? (
              <li>
                <Pill variant="rosewood">
                  {conflictCount}{" "}
                  {conflictCount === 1 ? "overlap" : "overlaps"}
                </Pill>
              </li>
            ) : null}
            {gapCount > 0 ? (
              <li>
                <Pill variant="clay">
                  {gapCount} {gapCount === 1 ? "gap" : "gaps"}
                </Pill>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ContextRail({
  projectId,
  aggregates,
}: {
  projectId: string;
  aggregates: TimelineAggregates;
}) {
  const {
    daySpanLabel,
    total,
    scheduledDurationLabel,
    conflictCount,
    gapCount,
    sameOwnerConflictCount,
    owners,
    sections,
  } = aggregates;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <Eyebrow>Day at a glance</Eyebrow>
        <dl className="mt-3 space-y-2.5 text-[14px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Span</dt>
            <dd className="tabular-nums text-ink">{daySpanLabel ?? "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Events</dt>
            <dd className="tabular-nums text-ink">{total}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Scheduled</dt>
            <dd className="tabular-nums text-ink">{scheduledDurationLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Sections</dt>
            <dd className="tabular-nums text-ink">
              {sections.filter((s) => !s.unscheduled).length}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-4 sm:p-5">
        <Eyebrow>Flags</Eyebrow>
        {conflictCount === 0 && gapCount === 0 ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            No gaps or overlaps detected. Start-only events never create gaps.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-[14px]">
            {conflictCount > 0 ? (
              <li className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rosewood"
                  aria-hidden
                />
                <span className="text-ink">
                  <span className="font-medium tabular-nums text-rosewood">
                    {conflictCount}
                  </span>{" "}
                  {conflictCount === 1 ? "overlap" : "overlaps"}
                  {sameOwnerConflictCount > 0 ? (
                    <span className="text-ink-muted">
                      {" "}
                      · {sameOwnerConflictCount} same-owner
                    </span>
                  ) : null}
                </span>
              </li>
            ) : null}
            {gapCount > 0 ? (
              <li className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-clay"
                  aria-hidden
                />
                <span className="text-ink">
                  <span className="font-medium tabular-nums text-clay">
                    {gapCount}
                  </span>{" "}
                  open {gapCount === 1 ? "gap" : "gaps"} between timed events
                </span>
              </li>
            ) : null}
          </ul>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <Eyebrow>Run sheet</Eyebrow>
        <p className="mt-2 text-[13px] leading-snug text-ink-muted">
          Print or save a PDF for a vendor — or the full master sheet.
        </p>
        <div className="mt-3">
          <ButtonLink
            href={runSheetHref(projectId, null)}
            variant="secondary"
            className="w-full text-[13px]"
          >
            Print run sheet
          </ButtonLink>
        </div>
        {owners.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            <li>
              <Link
                href={runSheetHref(projectId, null)}
                className="inline-block rounded-full border border-stone px-2.5 py-1 text-[12px] text-ink-muted no-underline transition-colors hover:border-ink-muted"
              >
                All owners
              </Link>
            </li>
            {owners.map((owner) => (
              <li key={owner}>
                <Link
                  href={runSheetHref(projectId, owner)}
                  className="inline-block rounded-full border border-stone px-2.5 py-1 text-[12px] text-ink-muted no-underline transition-colors hover:border-ink-muted"
                >
                  {owner}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function SectionGroup({
  section,
  collapsed,
  onToggle,
  editingId,
  onEdit,
}: {
  section: TimelineSectionGroup;
  collapsed: boolean;
  onToggle: () => void;
  editingId: string | null;
  onEdit: (id: string | null) => void;
}) {
  return (
    <li className="border-b border-stone last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 py-2.5 text-left"
      >
        <span
          className={cn(
            "text-ink-muted transition-transform",
            collapsed ? "-rotate-90" : "rotate-0",
          )}
          aria-hidden
        >
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
            <path d="M2.5 4.25L6 7.75l3.5-3.5" />
          </svg>
        </span>
        <span className="text-[15px] font-medium text-ink">
          {section.label}
          <span className="ml-1.5 font-normal tabular-nums text-ink-muted">
            · {section.total}
          </span>
        </span>
      </button>

      {!collapsed ? (
        <ul className="pb-3 pl-5">
          {section.events.map((event) => (
            <EventWithSignals
              key={event.id}
              event={event}
              isEditing={editingId === event.id}
              onEdit={() => onEdit(event.id)}
              onCloseEdit={() => onEdit(null)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function EventWithSignals({
  event,
  isEditing,
  onEdit,
  onCloseEdit,
}: {
  event: TimelineAnnotatedEvent;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
}) {
  return (
    <li>
      <TimelineEventRow
        event={event}
        durationMinutes={event.durationMinutes}
        overlaps={event.overlaps}
        isEditing={isEditing}
        onEdit={onEdit}
        onCloseEdit={onCloseEdit}
      />
      {event.gapAfterMinutes != null ? (
        <div className="flex items-center gap-2 py-1.5 pl-1">
          <span className="h-px flex-1 bg-stone" aria-hidden />
          <Pill variant="clay">
            {formatDurationMinutes(event.gapAfterMinutes)} open
          </Pill>
          <span className="h-px flex-1 bg-stone" aria-hidden />
        </div>
      ) : null}
    </li>
  );
}

export function TimelineBoard({ projectId, aggregates }: TimelineBoardProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-5">
      <DaySummaryStrip aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-4">
          <Eyebrow>Events</Eyebrow>

          <AddEventForm projectId={projectId} />

          {aggregates.sections.length === 0 ? (
            <p className="px-1 text-[13px] text-ink-muted">
              No events yet. Add the first moment — ceremony, cocktail hour, first
              dance, and so on.
            </p>
          ) : (
            <Card className="px-4 py-1 sm:px-5">
              <ul>
                {aggregates.sections.map((section) => (
                  <SectionGroup
                    key={section.key}
                    section={section}
                    collapsed={Boolean(collapsed[section.key])}
                    onToggle={() => toggleSection(section.key)}
                    editingId={editingId}
                    onEdit={setEditingId}
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ContextRail projectId={projectId} aggregates={aggregates} />
        </aside>
      </div>
    </div>
  );
}
