"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteLead,
  updateLead,
  updateLeadStage,
} from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
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
  "min-w-0 max-w-full flex-1 rounded-[var(--radius-inner)] border border-ring bg-surface px-2 py-1.5 text-[13px] text-ink outline-none transition-colors focus:border-accent disabled:opacity-50";

const fieldWrapClasses = "min-w-0 space-y-1.5";
const fieldClasses = "w-full min-w-0";
const compactButtonClasses =
  "min-w-0 flex-1 whitespace-nowrap px-2 py-1.5 text-[13px]";

export function LeadRow({
  lead,
  onStageChange,
  replyDraft,
  onOpenReplyDraft,
}: {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
  replyDraft?: AgentDraftPreview | null;
  onOpenReplyDraft?: () => void;
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
      <Card className={cn("min-w-0 p-3", isPending && "opacity-60")}>
        <form onSubmit={handleEditSubmit} className="min-w-0 space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={cn(fieldClasses, "max-w-full")}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
            <div className={fieldWrapClasses}>
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
                className={fieldClasses}
              />
            </div>
          </div>

          {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

          <div className="flex min-w-0 gap-2">
            <Button
              type="submit"
              disabled={isPending}
              className={compactButtonClasses}
            >
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              className={compactButtonClasses}
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
    <Card className={cn("min-w-0 px-3 py-3", isPending && "opacity-60")}>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0">
          <Link
            href={`/leads/${lead.id}`}
            className="break-words text-[15px] font-medium text-ink no-underline hover:text-accent"
          >
            {lead.couple_name}
          </Link>
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
            {weddingDate ? <span>{weddingDate}</span> : null}
            {budget ? <span className="tabnum">{budget}</span> : null}
            {lead.venue ? <span className="break-words">{lead.venue}</span> : null}
            {lead.source ? <span className="break-words">via {lead.source}</span> : null}
          </div>
          {replyDraft && onOpenReplyDraft ? (
            <div className="mt-1.5">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenReplyDraft();
                }}
                className="rounded-[var(--radius-pill)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Pill
                  variant="clay"
                  className="gap-1.5 normal-case tracking-normal"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-clay"
                    aria-hidden
                  />
                  {replyDraft.status === "approved"
                    ? "Retry send"
                    : "Reply ready"}
                </Pill>
              </button>
            </div>
          ) : null}
          {lead.isStale ? (
            <div className="mt-1.5">
              <Pill
                variant="rosewood"
                className="gap-1.5 normal-case tracking-normal"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full bg-rosewood"
                  aria-hidden
                />
                No activity in {lead.staleDays ?? "?"}d
              </Pill>
            </div>
          ) : null}
          {contact ? (
            <div className="mt-0.5 break-words text-[13px] text-muted">
              {contact}
            </div>
          ) : null}
          {lead.notes ? (
            <p className="mt-2 line-clamp-2 break-words text-[13px] text-muted">
              {lead.notes}
            </p>
          ) : null}
          {error ? (
            <p className="mt-1 text-[13px] text-rosewood">{error}</p>
          ) : null}
        </div>

        <div className="flex min-w-0 w-full items-center gap-1.5">
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
            className="shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px]"
          >
            Edit
          </Button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            aria-label={`Delete ${lead.couple_name}`}
            className="shrink-0 rounded-[var(--radius-inner)] p-1.5 text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M3.5 4.5h9M6.5 4.5V3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V4.5m1.5 0V12.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5" />
              <path d="M7 7v4.5M9 7v4.5" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
