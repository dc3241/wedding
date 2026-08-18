"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useState, useTransition } from "react";
import { deleteLead, updateLeadStage } from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { LeadEditModal, friendlyLeadError } from "./LeadEditModal";
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

export function LeadRow({
  lead,
  onStageChange,
  replyDraft,
  onOpenReplyDraft,
  dragHandle,
}: {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
  replyDraft?: AgentDraftPreview | null;
  onOpenReplyDraft?: () => void;
  dragHandle?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeEdit = useCallback(() => setEditing(false), []);

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
        setError(friendlyLeadError(result.error));
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
        setError(friendlyLeadError(result.error));
      }
    });
  }

  return (
    <>
      <Card className={cn("min-w-0 px-3 py-3", isPending && "opacity-60")}>
        <div className="flex min-w-0 gap-2">
          {dragHandle}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
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
              {lead.venue ? (
                <span className="break-words">{lead.venue}</span>
              ) : null}
              {lead.source ? (
                <span className="break-words">via {lead.source}</span>
              ) : null}
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
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setEditing(true);
              }}
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
        </div>
      </Card>
      {editing ? (
        <LeadEditModal
          key={lead.id}
          lead={lead}
          onClose={closeEdit}
        />
      ) : null}
    </>
  );
}
