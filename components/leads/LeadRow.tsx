"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useState, useTransition } from "react";
import { deleteLead, updateLeadStage } from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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

export function LeadRow({
  lead,
  onStageChange,
  replyDraft,
  onOpenReplyDraft,
  dragHandle,
  idPrefix,
}: {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
  replyDraft?: AgentDraftPreview | null;
  onOpenReplyDraft?: () => void;
  dragHandle?: ReactNode;
  idPrefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const closeEdit = useCallback(() => setEditing(false), []);

  const stageFieldId = idPrefix
    ? `stage-${idPrefix}-${lead.id}`
    : `stage-${lead.id}`;
  const weddingDate = formatLeadDate(lead.wedding_date);
  const budget = formatLeadBudget(lead.estimated_budget);
  const when = [weddingDate, budget].filter(Boolean).join(" · ");
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
      <Card className={cn("min-w-0 px-3.5 py-3", isPending && "opacity-60")}>
        <div className="flex min-w-0 items-start gap-1.5">
          {dragHandle}
          <div className="min-w-0 flex-1">
            <Link
              href={`/leads/${lead.id}`}
              className="line-clamp-2 text-[15px] font-medium leading-snug text-ink no-underline hover:text-accent"
            >
              {lead.couple_name}
            </Link>

            {when ? (
              <p className="mt-1 truncate text-[13px] text-muted">
                {weddingDate ? <span>{weddingDate}</span> : null}
                {weddingDate && budget ? <span> · </span> : null}
                {budget ? <span className="tabnum">{budget}</span> : null}
              </p>
            ) : null}
            {lead.venue ? (
              <p className="truncate text-[13px] text-muted" title={lead.venue}>
                {lead.venue}
              </p>
            ) : null}
            {lead.source ? (
              <p className="truncate text-[13px] text-muted">via {lead.source}</p>
            ) : null}
            {lead.contact_email ? (
              <p
                className="mt-1.5 truncate text-[13px] text-muted"
                title={lead.contact_email}
              >
                {lead.contact_email}
              </p>
            ) : null}
            {lead.contact_phone ? (
              <p
                className={cn(
                  "truncate text-[13px] text-muted",
                  lead.contact_email ? null : "mt-1.5",
                )}
                title={lead.contact_phone}
              >
                {lead.contact_phone}
              </p>
            ) : null}
            {lead.notes ? (
              <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-ink">
                {lead.notes}
              </p>
            ) : null}

            {replyDraft && onOpenReplyDraft ? (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenReplyDraft();
                }}
                className="mt-2 flex w-fit items-center gap-1.5 rounded-[var(--radius-pill)] text-left text-[13px] font-medium text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full bg-clay"
                  aria-hidden
                />
                {replyDraft.status === "approved" ? "Retry send" : "Reply ready"}
              </button>
            ) : null}
            {lead.isStale ? (
              <p className="mt-1.5 flex w-fit items-center gap-1.5 text-[13px] font-medium text-rosewood">
                <span
                  className="size-1.5 shrink-0 rounded-full bg-rosewood"
                  aria-hidden
                />
                No activity in {lead.staleDays ?? "?"}d
              </p>
            ) : null}
            {error ? (
              <p className="mt-1.5 text-[13px] text-rosewood">{error}</p>
            ) : null}

            <div className="mt-3 flex items-center gap-1 border-t border-hairline pt-2">
              <label className="sr-only" htmlFor={stageFieldId}>
                Stage
              </label>
              <div className="min-w-0 flex-1">
                <Select
                  id={stageFieldId}
                  compact
                  value={lead.stage}
                  onChange={handleStageChange}
                  disabled={isPending}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {LEAD_STAGE_LABEL[stage]}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                disabled={isPending}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setEditing(true);
                }}
                aria-label={`Edit ${lead.couple_name}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-inner)] text-muted transition-colors hover:bg-well hover:text-ink focus-visible:bg-well focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M8.8 3.2 12.8 7.2" />
                  <path d="M2.8 13.2 3.4 10.4 10.6 3.2a1.1 1.1 0 0 1 1.6 0l.6.6a1.1 1.1 0 0 1 0 1.6L5.6 12.6 2.8 13.2Z" />
                </svg>
              </button>
              <button
                type="button"
                disabled={isPending}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleDelete}
                aria-label={`Delete ${lead.couple_name}`}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-inner)] text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
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
