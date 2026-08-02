"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./actions";
import { eventLocalDate, localTimeHm } from "./calendar-source";
import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
  type ActiveWedding,
  type CalendarEventRow,
  type EventKind,
} from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Mode =
  | { type: "create"; date: string }
  | { type: "edit"; event: CalendarEventRow };

export function CalendarEventPanel({
  mode,
  weddings,
  onClose,
}: {
  mode: Mode;
  weddings: ActiveWedding[];
  onClose: () => void;
}) {
  const editing = mode.type === "edit";
  const event = editing ? mode.event : null;

  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(event?.event_kind ?? "meeting");
  const [date, setDate] = useState(
    event ? eventLocalDate(event) : mode.type === "create" ? mode.date : "",
  );
  const [allDay, setAllDay] = useState(event?.all_day ?? true);
  const [startTime, setStartTime] = useState(
    event && !event.all_day ? localTimeHm(event.starts_at) : "09:00",
  );
  const [endTime, setEndTime] = useState(
    event?.ends_at && !event.all_day ? localTimeHm(event.ends_at) : "",
  );
  const [projectId, setProjectId] = useState(event?.project_id ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode.type === "create") {
      setTitle("");
      setKind("meeting");
      setDate(mode.date);
      setAllDay(true);
      setStartTime("09:00");
      setEndTime("");
      setProjectId("");
      setLocation("");
      setNotes("");
      setError(null);
      return;
    }
    setTitle(mode.event.title);
    setKind(mode.event.event_kind);
    setDate(eventLocalDate(mode.event));
    setAllDay(mode.event.all_day);
    setStartTime(
      mode.event.all_day ? "09:00" : localTimeHm(mode.event.starts_at),
    );
    setEndTime(
      mode.event.ends_at && !mode.event.all_day
        ? localTimeHm(mode.event.ends_at)
        : "",
    );
    setProjectId(mode.event.project_id ?? "");
    setLocation(mode.event.location ?? "");
    setNotes(mode.event.notes ?? "");
    setError(null);
  }, [mode]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        title,
        kind,
        date,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime || null,
        location,
        notes,
        projectId: projectId || null,
      };

      const result = editing
        ? await updateCalendarEvent(mode.event.id, payload)
        : await createCalendarEvent(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete “${mode.event.title}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCalendarEvent(mode.event.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Card className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {editing ? "Edit event" : "Add event"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="text-[14px] font-semibold text-muted hover:text-ink disabled:opacity-50"
        >
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Title
          </span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={isPending}
            placeholder="Venue walkthrough, cake tasting…"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Date
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={isPending}
          />
        </label>

        <label className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            disabled={isPending}
            className="size-4 rounded border-ring accent-[var(--accent)]"
          />
          All day
        </label>

        {!allDay ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                Start
              </span>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={isPending}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                End (optional)
              </span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Kind
          </span>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
            disabled={isPending}
          >
            {EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {EVENT_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Wedding (optional)
          </span>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={isPending}
          >
            <option value="">None</option>
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Location
          </span>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isPending}
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Notes
          </span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Optional"
          />
        </label>

        {error ? (
          <p className="text-[13px] font-medium text-rosewood">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" disabled={isPending}>
            {editing ? "Save" : "Add event"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={handleDelete}
              className="text-rosewood hover:bg-rosewood-wash hover:text-rosewood"
            >
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
