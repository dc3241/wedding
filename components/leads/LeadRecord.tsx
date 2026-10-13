"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { appendLeadNote, updateLead } from "@/app/(app)/leads/actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eventTypeLabel } from "@/lib/event-type";
import { cn } from "@/lib/cn";
import { getCopy } from "@/lib/venue-copy";
import { InquiryReplyDrawer } from "./InquiryReplyDrawer";
import { lostReasonLabel } from "./lead-lost";
import { leadSourceLabel } from "./lead-source";
import { LeadEditModal } from "./LeadEditModal";
import {
  formatTimelineTime,
  groupTimelineByDay,
  type LeadTimelineItem,
} from "./lead-timeline";
import {
  followupTiming,
  formatLeadBudget,
  formatLeadDate,
  type Lead,
  type LeadDateShare,
} from "./types";

function FollowupEditor({ lead }: { lead: Lead }) {
  const [date, setDate] = useState(lead.next_followup_on ?? "");
  const [action, setAction] = useState(lead.next_followup_action ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timing = followupTiming(date || null);

  useEffect(() => {
    setDate(lead.next_followup_on ?? "");
    setAction(lead.next_followup_action ?? "");
  }, [lead.next_followup_on, lead.next_followup_action]);

  function save(nextDate: string, nextAction: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateLead(lead.id, {
        next_followup_on: nextDate || null,
        next_followup_action: nextAction || null,
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        save(date, action);
      }}
    >
      <p className="text-[13px] text-muted">Follow up</p>
      <Input
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        disabled={isPending}
        aria-label="Follow-up date"
        className="min-w-0 max-w-full"
      />
      <Input
        type="text"
        value={action}
        onChange={(event) => setAction(event.target.value)}
        disabled={isPending}
        maxLength={80}
        placeholder="Call about the tour"
        aria-label="Follow-up action"
      />
      {timing === "overdue" ? (
        <p className="text-[13px] font-medium text-rosewood">Overdue</p>
      ) : timing === "today" ? (
        <p className="text-[13px] font-medium text-clay">Due today</p>
      ) : null}
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        {lead.next_followup_on ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setDate("");
              setAction("");
              save("", "");
            }}
            className="text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            Clear
          </button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-[13px]"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-hairline py-3 first:border-t-0 first:pt-0">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="mt-0.5 text-[15px] font-medium text-ink">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 text-[13px] font-medium text-accent hover:underline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function LeadRecord({
  lead,
  timeline,
  replyDraft,
  dateShares = [],
  plan = "planner",
  children,
}: {
  lead: Lead;
  timeline: LeadTimelineItem[];
  replyDraft: AgentDraftPreview | null;
  dateShares?: LeadDateShare[];
  plan?: string;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const days = groupTimelineByDay(timeline);
  const weddingDate = formatLeadDate(lead.wedding_date);
  const sourceLabel = leadSourceLabel(lead.source);
  const lostLabel =
    lead.stage === "lost" ? lostReasonLabel(lead.lost_reason) : null;
  const budget = formatLeadBudget(lead.estimated_budget);
  const guests =
    lead.estimated_guest_count == null
      ? null
      : new Intl.NumberFormat().format(lead.estimated_guest_count);

  function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const text = note;
    startTransition(async () => {
      const result = await appendLeadNote(lead.id, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-8">
          <Card className="p-5">
            <Eyebrow>Activity</Eyebrow>
            <form onSubmit={handleAddNote} className="mt-4 space-y-3">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a note"
                disabled={isPending}
                aria-label="Add a note"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {error ? (
                  <p className="text-[13px] text-rosewood" role="alert">
                    {error}
                  </p>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isPending || !note.trim()}>
                  {isPending ? "Saving…" : "Add note"}
                </Button>
              </div>
            </form>

            <div className="mt-4 rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed">
              <p className="text-[13px] text-muted">Notes</p>
              {lead.notes ? (
                <p className="mt-1 whitespace-pre-wrap text-[15px] font-medium leading-6 text-ink">
                  {lead.notes}
                </p>
              ) : (
                <p className="mt-1 text-[15px] font-medium text-muted">
                  No notes yet.
                </p>
              )}
            </div>

            {days.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted">
                Emails you send and proposal updates show up here.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {days.map((day) => (
                  <section key={day.label}>
                    <h2 className="text-[13px] font-medium text-muted">
                      {day.label}
                    </h2>
                    <ul className="mt-2 space-y-2">
                      {day.items.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-[15px] font-medium text-ink">
                              {item.title}
                            </p>
                            <time
                              dateTime={item.at}
                              className="shrink-0 text-[13px] tabular-nums text-muted"
                            >
                              {formatTimelineTime(item.at)}
                            </time>
                          </div>
                          {item.detail ? (
                            <p className="mt-0.5 truncate text-[13px] text-muted">
                              {item.detail}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          {children}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Details</Eyebrow>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Edit
              </button>
            </div>

            <FollowupEditor lead={lead} />

            <div className="mt-4">
              <Fact label="Email">
                {lead.contact_email ? (
                  <span className="flex items-start justify-between gap-3">
                    <a
                      href={`mailto:${lead.contact_email}`}
                      className="min-w-0 break-all text-ink no-underline hover:text-accent"
                    >
                      {lead.contact_email}
                    </a>
                    <CopyButton value={lead.contact_email} />
                  </span>
                ) : (
                  <span className="text-muted">None</span>
                )}
              </Fact>
              <Fact label="Phone">
                {lead.contact_phone ? (
                  <span className="flex items-start justify-between gap-3">
                    <a
                      href={`tel:${lead.contact_phone}`}
                      className="min-w-0 text-ink no-underline hover:text-accent"
                    >
                      {lead.contact_phone}
                    </a>
                    <CopyButton value={lead.contact_phone} />
                  </span>
                ) : (
                  <span className="text-muted">None</span>
                )}
              </Fact>
              <Fact label="Event date">
                <span className={cn(!weddingDate && "text-muted")}>
                  {weddingDate ?? "None"}
                </span>
                {dateShares.length > 0 ? (
                  <p className="mt-1 text-[13px] font-medium text-clay">
                    {getCopy("dateConflict", plan)}{" "}
                    {dateShares.map((share, index) => (
                      <span key={share.id}>
                        {index > 0 ? ", " : null}
                        <Link
                          href={share.href}
                          className="text-ink underline decoration-hairline underline-offset-2 hover:text-accent"
                        >
                          {share.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </Fact>
              <Fact label="Estimated budget">
                <span className={cn("tabular-nums", !budget && "text-muted")}>
                  {budget ?? "None"}
                </span>
              </Fact>
              <Fact label="Guest count">
                <span className={cn("tabular-nums", !guests && "text-muted")}>
                  {guests ?? "None"}
                </span>
              </Fact>
              <Fact label="Venue">
                <span className={cn(!lead.venue && "text-muted")}>
                  {lead.venue ?? "None"}
                </span>
              </Fact>
              <Fact label="Source">
                <span className={cn(!sourceLabel && "text-muted")}>
                  {sourceLabel ?? "None"}
                </span>
              </Fact>
              {lostLabel ? (
                <Fact label="Lost">
                  <span>{lostLabel}</span>
                  {lead.lost_note ? (
                    <span className="mt-1 block text-[13px] font-normal text-muted">
                      {lead.lost_note}
                    </span>
                  ) : null}
                </Fact>
              ) : null}
              <Fact label="Type">{eventTypeLabel(lead.event_type)}</Fact>
            </div>

            {replyDraft ? (
              <button
                type="button"
                onClick={() => setReplyOpen(true)}
                className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-clay"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full bg-clay"
                  aria-hidden
                />
                {replyDraft.status === "approved" ? "Retry send" : "Reply ready"}
              </button>
            ) : null}
          </Card>
        </aside>
      </div>

      {editing ? (
        <LeadEditModal lead={lead} onClose={() => setEditing(false)} />
      ) : null}
      <InquiryReplyDrawer
        draft={replyOpen ? replyDraft : null}
        coupleName={lead.couple_name}
        onClose={() => setReplyOpen(false)}
      />
    </>
  );
}
