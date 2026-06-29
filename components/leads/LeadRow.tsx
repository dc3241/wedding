"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteLead,
  updateLead,
  updateLeadStage,
} from "@/app/(app)/leads/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  formatLeadBudget,
  formatLeadDate,
  LEAD_STAGE_LABEL,
  LEAD_STAGES,
  type Lead,
  type LeadStage,
} from "./types";

const selectClasses =
  "rounded border border-stone bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors focus:border-plum disabled:opacity-50";

export function LeadRow({
  lead,
  onStageChange,
}: {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const weddingDate = formatLeadDate(lead.wedding_date);
  const budget = formatLeadBudget(lead.estimated_budget);
  const contact = [lead.contact_email, lead.contact_phone]
    .filter(Boolean)
    .join(" · ");

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LeadStage;
    if (next === lead.stage) return;

    setError(null);

    if (onStageChange) {
      onStageChange(lead.id, next);
      return;
    }

    startTransition(async () => {
      const result = await updateLeadStage(lead.id, next);
      if (!result.ok) {
        setError(result.error);
        e.target.value = lead.stage;
      }
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
        setError(result.error);
      }
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        setError(result.error);
        return;
      }

      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Card className={cn("p-4", isPending && "opacity-60")}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor={`edit-couple-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Couple name
              </label>
              <Input
                id={`edit-couple-${lead.id}`}
                name="couple_name"
                type="text"
                required
                defaultValue={lead.couple_name}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-email-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Email
              </label>
              <Input
                id={`edit-email-${lead.id}`}
                name="contact_email"
                type="email"
                defaultValue={lead.contact_email ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-phone-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Phone
              </label>
              <Input
                id={`edit-phone-${lead.id}`}
                name="contact_phone"
                type="tel"
                defaultValue={lead.contact_phone ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-date-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Wedding date
              </label>
              <Input
                id={`edit-date-${lead.id}`}
                name="wedding_date"
                type="date"
                defaultValue={lead.wedding_date ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-budget-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Estimated budget
              </label>
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
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-venue-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Venue
              </label>
              <Input
                id={`edit-venue-${lead.id}`}
                name="venue"
                type="text"
                defaultValue={lead.venue ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`edit-source-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Source
              </label>
              <Input
                id={`edit-source-${lead.id}`}
                name="source"
                type="text"
                defaultValue={lead.source ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor={`edit-notes-${lead.id}`}
                className="text-sm font-medium text-ink"
              >
                Notes
              </label>
              <Textarea
                id={`edit-notes-${lead.id}`}
                name="notes"
                rows={3}
                defaultValue={lead.notes ?? ""}
                disabled={isPending}
              />
            </div>
          </div>

          {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setEditing(false);
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

  return (
    <Card className={cn("px-4 py-3", isPending && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            className="text-[15px] font-medium text-ink no-underline hover:text-plum-deep"
          >
            {lead.couple_name}
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-ink-muted">
            {weddingDate ? <span>{weddingDate}</span> : null}
            {budget ? <span className="tabnum">{budget}</span> : null}
            {lead.venue ? <span>{lead.venue}</span> : null}
            {lead.source ? <span>via {lead.source}</span> : null}
          </div>
          {contact ? (
            <div className="mt-0.5 text-[13px] text-ink-muted">{contact}</div>
          ) : null}
          {lead.notes ? (
            <p className="mt-2 line-clamp-2 text-[13px] text-ink-muted">
              {lead.notes}
            </p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[13px] text-rosewood">{error}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`stage-${lead.id}`}>
            Stage
          </label>
          <select
            id={`stage-${lead.id}`}
            value={lead.stage}
            onChange={handleStageChange}
            disabled={isPending}
            className={selectClasses}
          >
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {LEAD_STAGE_LABEL[stage]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="default"
            disabled={isPending}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={handleDelete}
            className="text-ink-muted hover:text-rosewood"
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
