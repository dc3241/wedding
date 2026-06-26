"use client";

import { useEffect, useState, useTransition } from "react";
import { removeEvent, updateEvent } from "./actions";
import {
  formatTimeRange,
  timeInputValue,
  type TimelineEvent,
} from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useAccountKind } from "@/components/account-density-provider";
import { dataRowClass } from "@/lib/density";

export function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const accountKind = useAccountKind();
  const rowClass = dataRowClass(accountKind);
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

  function saveField(
    fields: Parameters<typeof updateEvent>[1],
    revert?: () => void,
  ) {
    startTransition(async () => {
      try {
        await updateEvent(event.id, fields);
      } catch {
        revert?.();
      }
    });
  }

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === event.title) {
      setTitle(event.title);
      return;
    }
    saveField({ title: trimmed }, () => setTitle(event.title));
  }

  function saveDescription() {
    const next = description.trim();
    const current = event.description ?? "";
    if (next === current) return;
    saveField({ description: next }, () => setDescription(current));
  }

  function saveStartTime() {
    const next = startTime.trim();
    const current = timeInputValue(event.start_time);
    if (next === current) return;
    saveField({ start_time: next || null }, () => setStartTime(current));
  }

  function saveEndTime() {
    const next = endTime.trim();
    const current = timeInputValue(event.end_time);
    if (next === current) return;
    saveField({ end_time: next || null }, () => setEndTime(current));
  }

  function saveSection() {
    const next = section.trim();
    const current = event.section ?? "";
    if (next === current) return;
    saveField({ section: next || null }, () => setSection(current));
  }

  function saveOwner() {
    const next = owner.trim();
    const current = event.owner ?? "";
    if (next === current) return;
    saveField({ owner: next || null }, () => setOwner(current));
  }

  function handleDelete() {
    if (!window.confirm("Delete this timeline event? This cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await removeEvent(event.id);
    });
  }

  return (
    <li
      className={cn(
        "relative border-b border-stone last:border-b-0",
        rowClass,
        isPending && "opacity-60",
      )}
    >
      <span
        className="absolute top-3 -left-[25px] size-2 -translate-x-1/2 rounded-full border border-stone bg-porcelain"
        aria-hidden
      />

      <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="hidden text-[13px] font-medium tabular-nums text-ink sm:block">
            {formatTimeRange(
              startTime ? `${startTime}:00` : null,
              endTime ? `${endTime}:00` : null,
            )}
          </p>
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-muted sm:sr-only">
              Start time
            </span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={saveStartTime}
              disabled={isPending}
              className="px-2 py-1.5 text-[13px] tabular-nums"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-ink-muted">End</span>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={saveEndTime}
              disabled={isPending}
              className="px-2 py-1.5 text-[13px] tabular-nums"
            />
          </label>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="Event title"
              disabled={isPending}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-muted"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="shrink-0 text-[13px] text-ink-muted transition-colors hover:text-rosewood disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            aria-label="Event description"
            rows={2}
            placeholder="Description"
            disabled={isPending}
            className="mt-2 resize-y text-[14px]"
          />

          {owner.trim() ? (
            <p className="mt-1 text-[13px] text-ink-muted">{owner.trim()}</p>
          ) : null}

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-muted">Section</span>
              <Input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                onBlur={saveSection}
                disabled={isPending}
                className="py-1.5 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-muted">Owner</span>
              <Input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                onBlur={saveOwner}
                disabled={isPending}
                className="py-1.5 text-[13px]"
              />
            </label>
          </div>
        </div>
      </div>
    </li>
  );
}
