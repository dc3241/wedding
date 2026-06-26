"use client";

import { useRef, useTransition } from "react";
import { addEvent } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function AddEventForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
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
    });
  }

  return (
    <Card className={cn("p-5", isPending && "opacity-60")}>
      <h2 className="text-[15px] font-medium text-ink">Add event</h2>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-4 space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] text-ink-muted">Start time</span>
            <Input name="start_time" type="time" disabled={isPending} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] text-ink-muted">
              End time (optional)
            </span>
            <Input name="end_time" type="time" disabled={isPending} />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-muted">Title</span>
          <Input
            name="title"
            type="text"
            placeholder="Ceremony, first dance, cake cutting…"
            required
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-muted">
            Description (optional)
          </span>
          <Textarea
            name="description"
            rows={2}
            placeholder="Details for the run sheet"
            disabled={isPending}
            className="text-[15px]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] text-ink-muted">
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
            <span className="mb-1 block text-[13px] text-ink-muted">
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
