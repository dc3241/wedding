"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProject } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function NewWeddingForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const name = (new FormData(form).get("name") as string) ?? "";

    startTransition(async () => {
      const result = await createProject(name);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setOpen(false);
      router.push(`/projects/${result.projectId}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        New wedding
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="new-wedding-name" className="text-sm font-medium text-ink">
            Wedding name
          </label>
          <Input
            id="new-wedding-name"
            name="name"
            type="text"
            required
            disabled={isPending}
            placeholder="Emma & Noah — June 2027"
          />
          {error ? (
            <p className="text-sm text-rosewood">{error}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
