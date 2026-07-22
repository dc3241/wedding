"use client";

import Link from "next/link";
import { useState } from "react";
import { AddEventForm } from "./AddEventForm";
import { TimelineEventRow } from "./TimelineEventRow";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
  projectName: string;
  weddingDate: string | null;
  aggregates: TimelineAggregates;
};

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
    <Card className="p-[30px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
            {total}
          </p>
          <p className="mt-2 text-[14px] font-medium text-muted">
            {total === 1 ? "event" : "events"}
            {scheduledDurationLabel !== "—"
              ? ` · ${scheduledDurationLabel} scheduled`
              : ""}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="font-display text-[22px] font-extrabold leading-none tracking-[-0.05em] tabular-nums text-muted">
            {daySpanLabel ?? "—"}
          </p>
          <p className="mt-1 text-[14px] font-medium text-muted">day span</p>
        </div>
      </div>

      {(conflictCount > 0 || gapCount > 0) && (
        <ul className="flex flex-wrap gap-2.5">
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
      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Day at a glance
        </p>
        <dl className="space-y-0">
          {(
            [
              ["Span", daySpanLabel ?? "—"],
              ["Events", String(total)],
              ["Scheduled", scheduledDurationLabel],
              [
                "Sections",
                String(sections.filter((s) => !s.unscheduled).length),
              ],
            ] as const
          ).map(([label, value], i) => (
            <div
              key={label}
              className={cn(
                "flex items-baseline justify-between gap-3 py-[11px] text-[15px] font-medium",
                i > 0 && "border-t border-hairline",
              )}
            >
              <dt className="text-muted">{label}</dt>
              <dd className="tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Flags
        </p>
        {conflictCount === 0 && gapCount === 0 ? (
          <p className="text-[15px] font-medium leading-snug text-muted">
            No gaps or overlaps detected. Start-only events never create gaps.
          </p>
        ) : (
          <ul>
            {conflictCount > 0 ? (
              <li className="border-t border-hairline py-[11px] text-[15px] font-medium leading-snug text-ink first:border-t-0 first:pt-0">
                <span className="tabular-nums text-rosewood">{conflictCount}</span>{" "}
                {conflictCount === 1 ? "overlap" : "overlaps"}
                {sameOwnerConflictCount > 0 ? (
                  <span className="block text-[13px] font-normal text-muted">
                    {sameOwnerConflictCount} same-owner
                  </span>
                ) : null}
              </li>
            ) : null}
            {gapCount > 0 ? (
              <li className="border-t border-hairline py-[11px] text-[15px] font-medium leading-snug text-ink first:border-t-0 first:pt-0">
                <span className="tabular-nums text-clay">{gapCount}</span> open{" "}
                {gapCount === 1 ? "gap" : "gaps"} between timed events
              </li>
            ) : null}
          </ul>
        )}
      </Card>

      <Card className="px-6 py-[22px]">
        <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Run sheet
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          Print or save a PDF for a vendor — or the full master sheet.
        </p>
        <div className="mt-4">
          <ButtonLink
            href={runSheetHref(projectId, null)}
            variant="secondary"
            className="w-full text-[13px]"
          >
            Print run sheet
          </ButtonLink>
        </div>
        {owners.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Link
                href={runSheetHref(projectId, null)}
                className="inline-block rounded-[var(--radius-pill)] bg-well px-3.5 py-2 text-[13px] font-semibold text-muted no-underline transition-colors hover:text-ink"
              >
                All owners
              </Link>
            </li>
            {owners.map((owner) => (
              <li key={owner}>
                <Link
                  href={runSheetHref(projectId, owner)}
                  className="inline-block rounded-[var(--radius-pill)] bg-well px-3.5 py-2 text-[13px] font-semibold text-muted no-underline transition-colors hover:text-ink"
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
  open,
  onToggle,
  editingId,
  onEdit,
}: {
  section: TimelineSectionGroup;
  open: boolean;
  onToggle: () => void;
  editingId: string | null;
  onEdit: (id: string | null) => void;
}) {
  return (
    <details
      className="mb-4 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised last:mb-0"
      open={open}
    >
      <summary
        className="flex cursor-pointer list-none items-baseline justify-between gap-3.5 px-6 py-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {section.label}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[13px] font-medium tabular-nums text-muted">
          {section.total} {section.total === 1 ? "event" : "events"}
        </span>
      </summary>

      {open ? (
        <div className="px-3.5 pb-3.5">
          <ul>
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
        </div>
      ) : null}
    </details>
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
    <li className="mb-2 last:mb-0">
      <TimelineEventRow
        event={event}
        durationMinutes={event.durationMinutes}
        overlaps={event.overlaps}
        isEditing={isEditing}
        onEdit={onEdit}
        onCloseEdit={onCloseEdit}
      />
      {event.gapAfterMinutes != null ? (
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="h-px flex-1 bg-hairline" aria-hidden />
          <Pill variant="clay">
            {formatDurationMinutes(event.gapAfterMinutes)} open
          </Pill>
          <span className="h-px flex-1 bg-hairline" aria-hidden />
        </div>
      ) : null}
    </li>
  );
}

export function TimelineBoard({
  projectId,
  projectName,
  weddingDate,
  aggregates,
}: TimelineBoardProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const section of aggregates.sections) {
        initial[section.key] = true;
      }
      return initial;
    },
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day-of timeline"
        eyebrow={eyebrow}
        description="The hour-by-hour schedule for the wedding day — distinct from your long-range planning checklist."
      />

      <DaySummaryStrip aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4">
            <AddEventForm projectId={projectId} />
          </div>

          {aggregates.sections.length === 0 ? (
            <EmptyState>
              No events yet. Add the first moment — ceremony, cocktail hour,
              first dance, and so on.
            </EmptyState>
          ) : (
            <div>
              {aggregates.sections.map((section) => (
                <SectionGroup
                  key={section.key}
                  section={section}
                  open={openSections[section.key] ?? true}
                  onToggle={() => toggleSection(section.key)}
                  editingId={editingId}
                  onEdit={setEditingId}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ContextRail projectId={projectId} aggregates={aggregates} />
        </aside>
      </div>
    </div>
  );
}
