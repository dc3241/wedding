"use client";

import { useState } from "react";
import { createProject } from "@/app/(app)/projects/actions";

export function NewWeddingForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        New wedding
      </button>
    );
  }

  return (
    <form
      action={createProject}
      className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-1">
        <label htmlFor="new-wedding-name" className="text-sm font-medium">
          Wedding name
        </label>
        <input
          id="new-wedding-name"
          name="name"
          type="text"
          required
          placeholder="Emma & Noah — June 2027"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
