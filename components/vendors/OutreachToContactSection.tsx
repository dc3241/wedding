"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  draftOutreach,
  type OutreachBrief,
} from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";
import type { OutreachVendor } from "@/components/vendors/OutreachVendorRow";
import { OutreachVendorCard } from "@/components/vendors/OutreachVendorRow";

export function OutreachToContactSection({
  projectId,
  items,
  defaultDate,
}: {
  projectId: string;
  items: OutreachVendor[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const brief: OutreachBrief = {
      date: (form.get("date") as string) ?? "",
      venueArea: (form.get("venueArea") as string) ?? "",
      budgetVibe: (form.get("budgetVibe") as string) ?? "",
      askingFor: (form.get("askingFor") as string) ?? "",
    };

    startTransition(async () => {
      setError(null);
      const result = await draftOutreach(
        projectId,
        [...selected],
        brief
      );

      if (result?.ok === false) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={selected.size === items.length && items.length > 0}
            onChange={toggleAll}
            className="rounded border-zinc-300"
          />
          Select all
        </label>

        <button
          type="button"
          disabled={selected.size === 0 || isPending}
          onClick={() => {
            setError(null);
            setShowForm(true);
          }}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Draft outreach{selected.size > 0 ? ` (${selected.size})` : ""}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4"
        >
          <h4 className="text-sm font-medium">Outreach brief</h4>
          <p className="text-xs text-zinc-500">
            We&apos;ll draft a tailored email for each selected vendor using
            these details.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="brief-date" className="text-xs font-medium text-zinc-600">
                Date
              </label>
              <input
                id="brief-date"
                name="date"
                type="text"
                defaultValue={defaultDate}
                placeholder="e.g. October 18, 2026"
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="brief-venue"
                className="text-xs font-medium text-zinc-600"
              >
                Venue / area
              </label>
              <input
                id="brief-venue"
                name="venueArea"
                type="text"
                placeholder="e.g. Phoenix, AZ"
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="brief-budget"
              className="text-xs font-medium text-zinc-600"
            >
              Budget vibe
            </label>
            <input
              id="brief-budget"
              name="budgetVibe"
              type="text"
              placeholder="e.g. mid-range, flexible on florals"
              disabled={isPending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="brief-asking"
              className="text-xs font-medium text-zinc-600"
            >
              What you&apos;re asking for
            </label>
            <textarea
              id="brief-asking"
              name="askingFor"
              required
              rows={3}
              placeholder="e.g. Full wedding florals — bouquets, ceremony arch, and 12 reception centerpieces"
              disabled={isPending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? "Drafting…" : "Generate drafts"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowForm(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              className="mt-5 shrink-0 rounded border-zinc-300"
              aria-label={`Select ${item.vendor.name}`}
            />
            <div className="min-w-0 flex-1">
              <OutreachVendorCard projectId={projectId} item={item} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
