"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { createLead } from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { AccountPlan } from "@/lib/account-context";
import { cn } from "@/lib/cn";
import { getCopy } from "@/lib/venue-copy";
import { friendlyLeadError } from "./friendly-lead-error";

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AddLeadForm({ plan = "planner" }: { plan?: AccountPlan }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const coupleName = (form.get("couple_name") as string) ?? "";
    const budgetRaw = (form.get("estimated_budget") as string) ?? "";
    const budgetTrimmed = budgetRaw.trim();
    const estimatedBudget = budgetTrimmed ? Number(budgetTrimmed) : null;

    startTransition(async () => {
      try {
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
          setError(friendlyLeadError(result.error));
          return;
        }

        setOpen(false);
        setError(null);
      } catch (err) {
        setError(
          friendlyLeadError(
            err instanceof Error ? err.message : "Couldn't create lead.",
          ),
        );
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {getCopy("addLead", plan)}
      </Button>

      {open ? (
        <Modal
          onClose={handleClose}
          labelledBy={titleId}
          className={isPending ? "opacity-60" : undefined}
        >
          <form onSubmit={handleSubmit} className="min-w-0">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Eyebrow>{getCopy("leadsTitle", plan)}</Eyebrow>
                <h2
                  id={titleId}
                  className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink"
                >
                  {getCopy("addLead", plan)}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-well text-[16px] text-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="add-couple-name" label="Couple name" className="sm:col-span-2">
                <Input
                  id="add-couple-name"
                  name="couple_name"
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="Jordan & Alex"
                />
              </Field>
              <Field id="add-email" label="Email">
                <Input
                  id="add-email"
                  name="contact_email"
                  type="email"
                  disabled={isPending}
                  placeholder="alex@example.com"
                />
              </Field>
              <Field id="add-phone" label="Phone">
                <Input
                  id="add-phone"
                  name="contact_phone"
                  type="tel"
                  disabled={isPending}
                  placeholder="(555) 123-4567"
                />
              </Field>
              <Field id="add-date" label="Wedding date">
                <Input
                  id="add-date"
                  name="wedding_date"
                  type="date"
                  disabled={isPending}
                  className="min-w-0 max-w-full"
                />
              </Field>
              <Field id="add-budget" label="Estimated budget">
                <Input
                  id="add-budget"
                  name="estimated_budget"
                  type="number"
                  min={0}
                  step={100}
                  disabled={isPending}
                  placeholder="45000"
                />
              </Field>
              <Field id="add-venue" label="Venue">
                <Input
                  id="add-venue"
                  name="venue"
                  type="text"
                  disabled={isPending}
                  placeholder="The Barn at Willow Creek"
                />
              </Field>
              <Field id="add-source" label="Source">
                <Input
                  id="add-source"
                  name="source"
                  type="text"
                  disabled={isPending}
                  placeholder="Instagram, referral, wedding fair…"
                />
              </Field>
              <Field id="add-notes" label="Notes" className="sm:col-span-2">
                <Textarea
                  id="add-notes"
                  name="notes"
                  rows={4}
                  disabled={isPending}
                  placeholder="Initial inquiry details, preferences…"
                />
              </Field>
            </div>

            {error ? (
              <p className="mt-4 text-[13px] text-rosewood" role="alert">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-hairline pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={handleClose}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                {isPending ? "Saving…" : getCopy("saveLead", plan)}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
