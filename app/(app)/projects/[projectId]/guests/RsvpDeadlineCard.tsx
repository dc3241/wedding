"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { setRsvpDeadline } from "./meal-actions";

/** RSVP-AUTO-01 — RSVP-by date that drives automatic reminder drafts. */
export function RsvpDeadlineCard({
  projectId,
  rsvpDeadline,
  published,
}: {
  projectId: string;
  rsvpDeadline: string | null;
  published: boolean;
}) {
  const [value, setValue] = useState(rsvpDeadline ?? "");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(next: string) {
    setValue(next);
    setMessage(null);
    startTransition(async () => {
      const result = await setRsvpDeadline(projectId, next || null);
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        setValue(rsvpDeadline ?? "");
        return;
      }
      setMessage({ text: next ? "Saved." : "Cleared.", error: false });
    });
  }

  return (
    <Card className="px-6 py-5">
      <Eyebrow>RSVP deadline</Eyebrow>
      <p className="mt-2 text-[14px] text-muted">
        Guests see &ldquo;Please RSVP by&rdquo; this date. Three weeks and one
        week before it, we&apos;ll get a reminder ready for everyone who
        hasn&apos;t answered. Nothing is sent until you approve it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={value}
          onChange={(event) => save(event.target.value)}
          disabled={isPending}
          aria-label="RSVP by"
          className="w-auto"
        />
        {value ? (
          <button
            type="button"
            className="text-[13px] font-semibold text-muted hover:text-rosewood"
            onClick={() => save("")}
            disabled={isPending}
          >
            Clear
          </button>
        ) : null}
        {message ? (
          <span
            className={`text-[13px] ${message.error ? "text-rosewood" : "text-sage"}`}
            role={message.error ? "alert" : "status"}
          >
            {message.text}
          </span>
        ) : null}
      </div>
      {value && !published ? (
        <p className="mt-2 text-[13px] text-clay">
          Publish your website so guests have somewhere to RSVP.
        </p>
      ) : null}
    </Card>
  );
}
