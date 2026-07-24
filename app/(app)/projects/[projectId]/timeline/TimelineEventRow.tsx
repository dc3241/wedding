"use client";

import { useEffect, useState, useTransition } from "react";
import { removeEvent, updateEvent } from "./actions";
import {
  formatTimeRange,
  timeInputValue,
  type TimelineEvent,
} from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDurationMinutes,
  type TimelineOverlap,
} from "@/lib/timeline-aggregates";
import { cn } from "@/lib/cn";

type TimelineEventRowProps = {
  event: TimelineEvent;
  durationMinutes: number | null;
  overlaps: TimelineOverlap[];
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
};

export function TimelineEventRow({
  event,
  durationMinutes,
  overlaps,
  isEditing,
  onEdit,
  onCloseEdit,
}: TimelineEventRowProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [startTime, setStartTime] = useState(timeInputValue(event.start_time));
  const [endTime, setEndTime] = useState(timeInputValue(event.end_time));
  const [section, setSection] = useState(event.section ?? "");
  const [owner, setOwner] = useState(event.owner ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartTime(timeInputValue(event.start_time));
    setEndTime(timeInputValue(event.end_time));
    setSection(event.section ?? "");
    setOwner(event.owner ?? "");
  }, [event]);

  function resetFromEvent() {
    setTitle(event.title);
    setDescription(event.description ?? "");
    setStartTime(timeInputValue(event.start_time));
    setEndTime(timeInputValue(event.end_time));
    setSection(event.section ?? "");
    setOwner(event.owner ?? "");
  }

  function handleCancel() {
    resetFromEvent();
    onCloseEdit();
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitle(event.title);
      return;
    }

    startTransition(async () => {
      try {
        await updateEvent(event.id, {
          title: trimmedTitle,
          start_time: startTime.trim() || null,
          end_time: endTime.trim() || null,
          description: description.trim() || null,
          section: section.trim() || null,
          owner: owner.trim() || null,
        });
        onCloseEdit();
      } catch {
        resetFromEvent();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this timeline event? This cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await removeEvent(event.id);
      onCloseEdit();
    });
  }

  const hasConflict = overlaps.length > 0;
  const descriptionPreview = event.description?.trim() || null;
  const ownerLabel = event.owner?.trim() || null;

  if (isEditing) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed",
          hasConflict && "ring-2 ring-rosewood/40",
          isPending && "opacity-60",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Start time
            </span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={isPending}
              className="tabular-nums"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              End time (optional)
            </span>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={isPending}
              className="tabular-nums"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Title
          </span>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Description
          </span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={isPending}
            className="resize-y"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Section
            </span>
            <Input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={isPending}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Owner
            </span>
            <Input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={isPending}
            />
            <p className="mt-1.5 text-[13px] text-muted">
              Commas separate multiple owners, e.g. DJ, Officiant
            </p>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="px-3 py-1.5 text-[13px]"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={handleCancel}
            className="px-3 py-1.5 text-[13px]"
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed",
        hasConflict && "ring-2 ring-rosewood/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold tabular-nums text-ink">
              {event.start_time
                ? formatTimeRange(event.start_time, event.end_time)
                : "Unscheduled"}
            </span>
            {durationMinutes != null ? (
              <Pill variant="default">
                {formatDurationMinutes(durationMinutes)}
              </Pill>
            ) : null}
            {ownerLabel ? <Pill variant="accent">{ownerLabel}</Pill> : null}
          </div>

          <p className="mt-1.5 text-[15px] font-medium text-ink">{event.title}</p>

          {descriptionPreview ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">
              {descriptionPreview}
            </p>
          ) : null}

          {hasConflict ? (
            <ul className="mt-2 space-y-1">
              {overlaps.map((overlap) => (
                <li
                  key={overlap.otherId}
                  className="text-[13px] leading-snug text-rosewood"
                >
                  Overlaps {overlap.otherTitle}
                  {overlap.sameOwner ? " · same owner" : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-[14px] font-semibold text-accent hover:opacity-80"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
