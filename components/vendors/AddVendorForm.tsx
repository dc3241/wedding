"use client";

import { useTransition } from "react";
import { addVendor } from "@/app/(app)/projects/[projectId]/vendors/actions";

export function AddVendorForm({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) ?? "";
    const category = (form.get("category") as string) ?? "";
    const contactEmail = (form.get("contact_email") as string) ?? "";

    if (!name.trim()) return;

    startTransition(async () => {
      await addVendor(projectId, name, category, contactEmail);
      e.currentTarget.reset();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-zinc-200 p-4"
    >
      <h2 className="text-sm font-medium">Add vendor</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="name"
          type="text"
          required
          placeholder="Vendor name"
          disabled={isPending}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
        />
        <input
          name="category"
          type="text"
          placeholder="Category (e.g. florist)"
          disabled={isPending}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
        />
        <input
          name="contact_email"
          type="email"
          placeholder="Contact email"
          disabled={isPending}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        Add vendor
      </button>
    </form>
  );
}
