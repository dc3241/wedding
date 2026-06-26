"use client";

import { useState } from "react";
import { createProject } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function NewWeddingForm() {
  const [open, setOpen] = useState(false);

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
        action={createProject}
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
            placeholder="Emma & Noah — June 2027"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
