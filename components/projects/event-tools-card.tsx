"use client";

import { useState, useTransition } from "react";
import { updateProjectEventSettings } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  EVENT_TYPE_OPTIONS,
  type EventType,
  type HideableTool,
} from "@/lib/event-type";

export function EventToolsCard({
  projectId,
  eventType,
  hiddenTools,
}: {
  projectId: string;
  eventType: EventType;
  hiddenTools: readonly HideableTool[];
}) {
  const [type, setType] = useState<EventType>(eventType);
  const [includeSeating, setIncludeSeating] = useState(
    !hiddenTools.includes("seating"),
  );
  const [includeWebsite, setIncludeWebsite] = useState(
    !hiddenTools.includes("website"),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProjectEventSettings(projectId, {
        eventType: type,
        includeSeating,
        includeWebsite,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Event type
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Seating and the website can be turned off. Turn them back on any
            time.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="event-type"
              className="text-sm font-medium text-ink"
            >
              Type
            </label>
            <Select
              id="event-type"
              value={type}
              disabled={isPending}
              onChange={(e) => {
                setSaved(false);
                setType(e.target.value === "event" ? "event" : "wedding");
              }}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={includeSeating}
                disabled={isPending}
                onChange={(e) => {
                  setSaved(false);
                  setIncludeSeating(e.target.checked);
                }}
              />
              Seating chart
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={includeWebsite}
                disabled={isPending}
                onChange={(e) => {
                  setSaved(false);
                  setIncludeWebsite(e.target.checked);
                }}
              />
              Website
            </label>
          </div>
        </div>
        {error ? (
          <p className="text-[13px] text-rosewood" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-[13px] text-sage">Saved.</p>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </Card>
  );
}
