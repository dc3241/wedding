"use client";

import { useRef, useState, useTransition } from "react";
import { addEvent } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function AddEventForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;

    const startTime = String(data.get("start_time") ?? "").trim();
    const endTime = String(data.get("end_time") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const section = String(data.get("section") ?? "").trim();
    const owner = String(data.get("owner") ?? "").trim();

    startTransition(async () => {
      await addEvent(
        projectId,
        title,
        startTime || null,
        endTime || null,
        description || null,
        section || null,
        owner || null,
      );
      form.reset();
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-[var(--radius-inner)] border border-dashed border-ring bg-transparent px-4 py-3.5 text-left text-[15px] font-medium text-muted transition-colors",
          "hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        + Add event
      </button>
    );
  }

  return (
    <Card className={cn("px-6 py-5", isPending && "opacity-60")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          Add event
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="text-[14px] font-semibold text-muted hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Start time
            </span>
            <Input name="start_time" type="time" disabled={isPending} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              End time (optional)
            </span>
            <Input name="end_time" type="time" disabled={isPending} />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Title
          </span>
          <Input
            name="title"
            type="text"
            placeholder="Ceremony, first dance, cake cutting…"
            required
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Description (optional)
          </span>
          <Textarea
            name="description"
            rows={2}
            placeholder="Details for the run sheet"
            disabled={isPending}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Section (optional)
            </span>
            <Input
              name="section"
              type="text"
              placeholder="Ceremony, Reception…"
              disabled={isPending}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Owner (optional)
            </span>
            <Input
              name="owner"
              type="text"
              placeholder="DJ, photographer, MOH…"
              disabled={isPending}
            />
          </label>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add event"}
        </Button>
      </form>
    </Card>
  );
}
