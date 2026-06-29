"use client";

import { useState, useTransition } from "react";
import { createLead } from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function AddLeadForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const coupleName = (form.get("couple_name") as string) ?? "";
    const budgetRaw = (form.get("estimated_budget") as string) ?? "";
    const budgetTrimmed = budgetRaw.trim();
    const estimatedBudget = budgetTrimmed ? Number(budgetTrimmed) : null;

    startTransition(async () => {
      const result = await createLead({
        couple_name: coupleName,
        contact_email: (form.get("contact_email") as string) || undefined,
        contact_phone: (form.get("contact_phone") as string) || undefined,
        wedding_date: (form.get("wedding_date") as string) || undefined,
        venue: (form.get("venue") as string) || undefined,
        source: (form.get("source") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        estimated_budget:
          estimatedBudget !== null && !Number.isNaN(estimatedBudget)
            ? estimatedBudget
            : null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      e.currentTarget.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Add lead
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="lead-couple-name" className="text-sm font-medium text-ink">
              Couple name
            </label>
            <Input
              id="lead-couple-name"
              name="couple_name"
              type="text"
              required
              disabled={isPending}
              placeholder="Jordan & Alex"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-email" className="text-sm font-medium text-ink">
              Email
            </label>
            <Input
              id="lead-email"
              name="contact_email"
              type="email"
              disabled={isPending}
              placeholder="alex@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-phone" className="text-sm font-medium text-ink">
              Phone
            </label>
            <Input
              id="lead-phone"
              name="contact_phone"
              type="tel"
              disabled={isPending}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-date" className="text-sm font-medium text-ink">
              Wedding date
            </label>
            <Input
              id="lead-date"
              name="wedding_date"
              type="date"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-budget" className="text-sm font-medium text-ink">
              Estimated budget
            </label>
            <Input
              id="lead-budget"
              name="estimated_budget"
              type="number"
              min={0}
              step={100}
              disabled={isPending}
              placeholder="45000"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-venue" className="text-sm font-medium text-ink">
              Venue
            </label>
            <Input
              id="lead-venue"
              name="venue"
              type="text"
              disabled={isPending}
              placeholder="The Barn at Willow Creek"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lead-source" className="text-sm font-medium text-ink">
              Source
            </label>
            <Input
              id="lead-source"
              name="source"
              type="text"
              disabled={isPending}
              placeholder="Instagram, referral, wedding fair…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="lead-notes" className="text-sm font-medium text-ink">
              Notes
            </label>
            <Textarea
              id="lead-notes"
              name="notes"
              rows={3}
              disabled={isPending}
              placeholder="Initial inquiry details, preferences…"
            />
          </div>
        </div>

        {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save lead"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
