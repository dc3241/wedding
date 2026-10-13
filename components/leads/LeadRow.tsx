"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { updateLeadStage } from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { friendlyLeadError } from "./friendly-lead-error";
import { eventTypeLabel } from "@/lib/event-type";
import {
  formatLeadBudget,
  followupTiming,
  LEAD_STAGE_LABEL,
  LEAD_STAGES,
  type Lead,
  type LeadStage,
} from "./types";

function formatCardDate(date: string | null) {
  if (!date) return null;
  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return null;
  const month = parsed.toLocaleDateString("en-US", { month: "short" });
  const year = String(parsed.getFullYear()).slice(2);
  return `${month} ${parsed.getDate()} \u2019${year}`;
}

function cardMeta(lead: Lead): {
  primary: string | null;
  budget: string | null;
  guests: string | null;
} {
  const primaryParts: string[] = [];
  if (lead.event_type === "event") {
    primaryParts.push(eventTypeLabel(lead.event_type));
  }
  const weddingDate = formatCardDate(lead.wedding_date);
  if (weddingDate) {
    primaryParts.push(weddingDate);
  } else if (lead.venue) {
    primaryParts.push(lead.venue);
  }
  return {
    primary: primaryParts.length > 0 ? primaryParts.join(" · ") : null,
    budget: formatLeadBudget(lead.estimated_budget),
    guests:
      lead.estimated_guest_count == null
        ? null
        : `${new Intl.NumberFormat().format(lead.estimated_guest_count)} guests`,
  };
}

function followupCardText(
  lead: Lead,
  timing: ReturnType<typeof followupTiming>,
): string | null {
  if (!timing || !lead.next_followup_on) return null;
  const action = lead.next_followup_action?.trim();
  if (timing === "overdue") {
    return action ? `Overdue · ${action}` : "Follow up overdue";
  }
  if (timing === "today") {
    return action ? `Today · ${action}` : "Follow up today";
  }
  const when = formatCardDate(lead.next_followup_on);
  if (action && when) return `${when} · ${action}`;
  return when ? `Follow up ${when}` : "Follow up";
}

export function LeadRow({
  lead,
  onStageChange,
  replyDraft,
  onOpenReplyDraft,
  dragHandle,
  showStageMenu = false,
  idPrefix,
}: {
  lead: Lead;
  onStageChange?: (id: string, stage: LeadStage) => void;
  replyDraft?: AgentDraftPreview | null;
  onOpenReplyDraft?: () => void;
  dragHandle?: ReactNode;
  /** Mobile has no drag affordance, so the stage menu stays on the card. */
  showStageMenu?: boolean;
  idPrefix?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const stageFieldId = idPrefix
    ? `stage-${idPrefix}-${lead.id}`
    : `stage-${lead.id}`;
  const meta = cardMeta(lead);
  const metaTitle = [meta.primary, meta.budget, meta.guests]
    .filter(Boolean)
    .join(" · ");
  const showReply = Boolean(replyDraft && onOpenReplyDraft);
  const timing = followupTiming(lead.next_followup_on);
  const followupText = followupCardText(lead, timing);
  const showStale = Boolean(lead.isStale) && !showReply && !timing;

  function handleStageChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as LeadStage;
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
        event.target.value = lead.stage;
      }
    });
  }

  return (
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
          {metaTitle ? (
            <p
              className="mt-1 flex min-w-0 overflow-hidden text-[13px] text-muted"
              title={metaTitle}
            >
              {meta.primary ? (
                <span className="min-w-0 truncate">{meta.primary}</span>
              ) : null}
              {meta.budget ? (
                <span className="shrink-0 tabular-nums">
                  {meta.primary ? " · " : null}
                  {meta.budget}
                </span>
              ) : null}
              {meta.guests ? (
                <span className="shrink-0 tabular-nums">
                  {meta.primary || meta.budget ? " · " : null}
                  {meta.guests}
                </span>
              ) : null}
            </p>
          ) : null}

          {showReply && replyDraft && onOpenReplyDraft ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenReplyDraft();
              }}
              className="mt-2 flex w-fit max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] text-left text-[13px] font-medium text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className="size-1.5 shrink-0 rounded-full bg-clay"
                aria-hidden
              />
              <span className="truncate">
                {replyDraft.status === "approved" ? "Retry send" : "Reply ready"}
              </span>
            </button>
          ) : followupText ? (
            <p
              className={cn(
                "mt-2 flex w-fit max-w-full items-center gap-1.5 text-[13px] font-medium",
                timing === "overdue" ? "text-rosewood" : "text-clay",
              )}
              title={followupText}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  timing === "overdue" ? "bg-rosewood" : "bg-clay",
                )}
                aria-hidden
              />
              <span className="truncate">{followupText}</span>
            </p>
          ) : showStale ? (
            <p className="mt-2 flex w-fit items-center gap-1.5 text-[13px] font-medium text-rosewood">
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

          {showStageMenu ? (
            <div className="mt-3 border-t border-hairline pt-2">
              <label className="sr-only" htmlFor={stageFieldId}>
                Stage
              </label>
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
          ) : null}
        </div>
      </div>
    </Card>
  );
}
