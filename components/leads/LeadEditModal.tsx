"use client";

import { useId, useState, useTransition } from "react";
import { deleteLead, updateLead } from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import type { Lead } from "./types";

export function friendlyLeadError(message: string) {
  if (
    /permission denied|row-level security|violates|postgrest|postgres|pgrst|jwt/i.test(
      message,
    )
  ) {
    return "Something went wrong. Please try again.";
  }
  return message;
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
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

export function LeadEditModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const budgetRaw = (form.get("estimated_budget") as string) ?? "";
    const budgetTrimmed = budgetRaw.trim();
    const estimatedBudget = budgetTrimmed ? Number(budgetTrimmed) : null;

    startTransition(async () => {
      const result = await updateLead(lead.id, {
        couple_name: (form.get("couple_name") as string) ?? "",
        contact_email: (form.get("contact_email") as string) || null,
        contact_phone: (form.get("contact_phone") as string) || null,
        wedding_date: (form.get("wedding_date") as string) || null,
        venue: (form.get("venue") as string) || null,
        source: (form.get("source") as string) || null,
        notes: (form.get("notes") as string) || null,
        estimated_budget:
          estimatedBudget !== null && !Number.isNaN(estimatedBudget)
            ? estimatedBudget
            : null,
      });

      if (!result.ok) {
        setError(friendlyLeadError(result.error));
        return;
      }

      onClose();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete lead "${lead.couple_name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteLead(lead.id);
      if (!result.ok) {
        setError(friendlyLeadError(result.error));
        return;
      }
      onClose();
    });
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      className={isPending ? "opacity-60" : undefined}
    >
      <form onSubmit={handleSubmit} className="min-w-0">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>Edit lead</Eyebrow>
            <h2
              id={titleId}
              className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink"
            >
              {lead.couple_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-well text-[16px] text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id={`edit-couple-${lead.id}`}
            label="Couple name"
            className="sm:col-span-2"
          >
            <Input
              id={`edit-couple-${lead.id}`}
              name="couple_name"
              type="text"
              required
              defaultValue={lead.couple_name}
              disabled={isPending}
            />
          </Field>
          <Field id={`edit-email-${lead.id}`} label="Email">
            <Input
              id={`edit-email-${lead.id}`}
              name="contact_email"
              type="email"
              defaultValue={lead.contact_email ?? ""}
              disabled={isPending}
            />
          </Field>
          <Field id={`edit-phone-${lead.id}`} label="Phone">
            <Input
              id={`edit-phone-${lead.id}`}
              name="contact_phone"
              type="tel"
              defaultValue={lead.contact_phone ?? ""}
              disabled={isPending}
            />
          </Field>
          <Field id={`edit-date-${lead.id}`} label="Wedding date">
            <Input
              id={`edit-date-${lead.id}`}
              name="wedding_date"
              type="date"
              defaultValue={lead.wedding_date ?? ""}
              disabled={isPending}
              className="min-w-0 max-w-full"
            />
          </Field>
          <Field id={`edit-budget-${lead.id}`} label="Estimated budget">
            <Input
              id={`edit-budget-${lead.id}`}
              name="estimated_budget"
              type="number"
              min={0}
              step={100}
              defaultValue={
                lead.estimated_budget === null
                  ? ""
                  : String(lead.estimated_budget)
              }
              disabled={isPending}
            />
          </Field>
          <Field id={`edit-venue-${lead.id}`} label="Venue">
            <Input
              id={`edit-venue-${lead.id}`}
              name="venue"
              type="text"
              defaultValue={lead.venue ?? ""}
              disabled={isPending}
            />
          </Field>
          <Field id={`edit-source-${lead.id}`} label="Source">
            <Input
              id={`edit-source-${lead.id}`}
              name="source"
              type="text"
              defaultValue={lead.source ?? ""}
              disabled={isPending}
            />
          </Field>
          <Field
            id={`edit-notes-${lead.id}`}
            label="Notes"
            className="sm:col-span-2"
          >
            <Textarea
              id={`edit-notes-${lead.id}`}
              name="notes"
              rows={4}
              defaultValue={lead.notes ?? ""}
              disabled={isPending}
            />
          </Field>
        </div>

        {error ? (
          <p className="mt-4 text-[13px] text-rosewood" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-1 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-rosewood disabled:opacity-50 sm:text-left"
          >
            Delete lead
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={onClose}
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
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
