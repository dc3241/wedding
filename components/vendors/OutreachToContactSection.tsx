"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  draftOutreach,
  type OutreachBrief,
} from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { OutreachShortlistRow } from "@/components/vendors/OutreachVendorRow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      const result = await draftOutreach(projectId, [...selected], brief);

      if (result?.ok === false) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[13px] text-ink-muted">
          <input
            type="checkbox"
            checked={selected.size === items.length && items.length > 0}
            onChange={toggleAll}
            className="size-4 rounded border-stone accent-plum"
          />
          Select all
        </label>

        <Button
          type="button"
          variant="primary"
          disabled={selected.size === 0 || isPending}
          onClick={() => {
            setError(null);
            setShowForm(true);
          }}
        >
          Draft outreach
          {selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>

      {showForm ? (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Eyebrow>Outreach brief</Eyebrow>
              <p className="mt-1 text-[13px] text-ink-muted">
                We&apos;ll draft a tailored email for each selected vendor using
                these details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="brief-date" className="text-sm font-medium text-ink">
                  Date
                </label>
                <Input
                  id="brief-date"
                  name="date"
                  type="text"
                  defaultValue={defaultDate}
                  placeholder="e.g. October 18, 2026"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="brief-venue" className="text-sm font-medium text-ink">
                  Venue / area
                </label>
                <Input
                  id="brief-venue"
                  name="venueArea"
                  type="text"
                  placeholder="e.g. Phoenix, AZ"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="brief-budget" className="text-sm font-medium text-ink">
                Budget vibe
              </label>
              <Input
                id="brief-budget"
                name="budgetVibe"
                type="text"
                placeholder="e.g. mid-range, flexible on florals"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="brief-asking" className="text-sm font-medium text-ink">
                What you&apos;re asking for
              </label>
              <Textarea
                id="brief-asking"
                name="askingFor"
                required
                rows={3}
                placeholder="e.g. Full wedding florals — bouquets, ceremony arch, and 12 reception centerpieces"
                disabled={isPending}
              />
            </div>

            {error ? (
              <p className="text-sm text-rosewood">{error}</p>
            ) : null}

            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? "Drafting…" : "Generate drafts"}
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={isPending}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="divide-y divide-stone">
        {items.map((item) => (
          <OutreachShortlistRow
            key={item.id}
            projectId={projectId}
            item={item}
            selectable
            selected={selected.has(item.id)}
            onToggleSelect={() => toggle(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
