"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  applyMatchedSubmission,
  matchSubmissionToGuest,
  unmatchSubmission,
} from "./guest-member-actions";
import {
  deleteRsvpSubmission,
  setRsvpSubmissionStatus,
} from "./rsvp-submission-actions";
import {
  hintGuestMatch,
  type RsvpAttendee,
  type RsvpSubmission,
  type RsvpSubmissionStatus,
} from "./rsvp-submissions";
import type { RsvpStatus } from "./types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

export type RsvpMatchGuest = {
  id: string;
  full_name: string;
  rsvp_status: RsvpStatus;
  member_count: number;
};

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function needsGuestListApply(
  submission: RsvpSubmission,
  guest: RsvpMatchGuest | undefined,
): boolean {
  if (!submission.matched_guest_id || !guest) return false;

  if (submission.response === "yes") {
    if (guest.rsvp_status !== "attending") return true;
    // Headcount lives on members; empty means RSVP'd party_size never applied.
    return guest.member_count === 0;
  }

  if (submission.response === "no") {
    return guest.rsvp_status !== "declined";
  }

  return false;
}

function AttendeeList({ attendees }: { attendees: RsvpAttendee[] }) {
  if (attendees.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2 border-t border-hairline pt-3">
      {attendees.map((attendee) => (
        <li key={attendee.id} className="text-[13px] text-muted">
          <span className="font-medium text-ink">
            {attendee.name?.trim() || "Guest"}
          </span>
          {attendee.meal_name ? (
            <span>
              {" · "}
              {attendee.meal_name}
            </span>
          ) : null}
          {attendee.dietary_note?.trim() ? (
            <span className="block text-[13px] text-muted">
              Dietary: {attendee.dietary_note.trim()}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MatchControl({
  submission,
  guests,
}: {
  submission: RsvpSubmission;
  guests: RsvpMatchGuest[];
}) {
  const hintId = useMemo(
    () =>
      hintGuestMatch(
        submission.name,
        guests.map((guest) => ({ id: guest.id, full_name: guest.full_name })),
      ),
    [submission.name, guests],
  );
  const [guestId, setGuestId] = useState(hintId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const applyStartedRef = useRef(false);

  const matchedGuest = submission.matched_guest_id
    ? guests.find((guest) => guest.id === submission.matched_guest_id)
    : undefined;
  const pendingApply = needsGuestListApply(submission, matchedGuest);

  useEffect(() => {
    if (!pendingApply || applyStartedRef.current) return;
    applyStartedRef.current = true;
    startTransition(async () => {
      const result = await applyMatchedSubmission(submission.id);
      if (!result.ok) {
        applyStartedRef.current = false;
        setMessage("Could not apply this RSVP to the guest list.");
      }
    });
  }, [pendingApply, submission.id]);

  if (submission.matched_guest_id) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <Pill variant="sage">Matched</Pill>
        <span className="text-[13px] font-medium text-ink">
          {submission.matched_guest_name ?? "Guest"}
        </span>
        {pendingApply ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = await applyMatchedSubmission(submission.id);
                if (!result.ok) {
                  setMessage("Could not apply this RSVP to the guest list.");
                }
              });
            }}
            className="rounded-[var(--radius-pill)] bg-accent px-3.5 py-2 text-[13px] font-semibold text-surface disabled:opacity-50"
          >
            {isPending ? "Applying…" : "Apply to guest list"}
          </button>
        ) : (
          <span className="text-[13px] text-muted">
            {submission.response === "yes"
              ? `Applied · party of ${submission.party_size}`
              : "Applied · declined"}
          </span>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await unmatchSubmission(submission.id);
              if (!result.ok) setMessage("Could not unmatch.");
            });
          }}
          className="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
        >
          Unmatch
        </button>
        {message ? (
          <span className="text-[13px] text-rosewood">{message}</span>
        ) : null}
      </div>
    );
  }

  const hintGuest = hintId
    ? guests.find((guest) => guest.id === hintId)
    : null;

  return (
    <div className="mt-3 space-y-2 border-t border-hairline pt-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Match to guest
      </p>
      {hintGuest ? (
        <p className="text-[13px] text-muted">
          Suggested:{" "}
          <span className="font-medium text-ink">{hintGuest.full_name}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={guestId}
          onChange={(e) => setGuestId(e.target.value)}
          disabled={isPending || guests.length === 0}
          className="min-w-[12rem] max-w-full py-1.5 text-[14px]"
          aria-label="Match submission to guest"
        >
          <option value="">Select a guest…</option>
          {guests.map((guest) => (
            <option key={guest.id} value={guest.id}>
              {guest.full_name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          disabled={isPending || !guestId}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await matchSubmissionToGuest(
                submission.id,
                guestId,
              );
              if (result.ok) return;
              if (result.reason === "already_matched") {
                setMessage("Already matched.");
                return;
              }
              setMessage("Could not match.");
            });
          }}
          className="rounded-[var(--radius-pill)] bg-accent px-3.5 py-2 text-[13px] font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Matching…" : "Confirm match"}
        </button>
      </div>
      {message ? (
        <p className="text-[13px] text-rosewood" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function SubmissionRow({
  submission,
  guests,
}: {
  submission: RsvpSubmission;
  guests: RsvpMatchGuest[];
}) {
  const [isPending, startTransition] = useTransition();

  function toggleStatus() {
    const next: RsvpSubmissionStatus =
      submission.status === "new" ? "reviewed" : "new";
    startTransition(async () => {
      await setRsvpSubmissionStatus(submission.id, next);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRsvpSubmission(submission.id);
    });
  }

  return (
    <li
      className={cn(
        "mb-2 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
        isPending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[15px] font-medium text-ink">{submission.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant={submission.response === "yes" ? "sage" : "rosewood"}>
              {submission.response === "yes" ? "Yes" : "No"}
            </Pill>
            <span className="text-[13px] tabular-nums text-muted">
              Party of {submission.party_size}
            </span>
            <button
              type="button"
              onClick={toggleStatus}
              disabled={isPending}
              className="text-[13px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline disabled:cursor-not-allowed"
            >
              {submission.status === "new" ? "Mark reviewed" : "Mark as new"}
            </button>
          </div>
        </div>
        <time
          className="shrink-0 text-[13px] text-muted"
          dateTime={submission.created_at}
        >
          {formatSubmittedAt(submission.created_at)}
        </time>
      </div>
      {submission.email ? (
        <p className="mt-2 text-[13px] text-muted">
          <a
            href={`mailto:${submission.email}`}
            className="hover:text-ink hover:underline"
          >
            {submission.email}
          </a>
        </p>
      ) : null}
      {submission.message ? (
        <p className="mt-2 text-[14px] whitespace-pre-line text-muted">
          {submission.message}
        </p>
      ) : null}
      <AttendeeList attendees={submission.attendees} />
      <MatchControl submission={submission} guests={guests} />
      <div className="mt-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export function RsvpSubmissionsPanel({
  submissions,
  guests,
}: {
  submissions: RsvpSubmission[];
  guests: RsvpMatchGuest[];
}) {
  const newCount = submissions.filter((row) => row.status === "new").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Website responses
          </p>
          <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            RSVP inbox
          </h2>
        </div>
        {newCount > 0 ? (
          <span className="text-[13px] font-semibold text-accent">
            {newCount} new response{newCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {submissions.length === 0 ? (
        <EmptyState>
          When guests RSVP from your published wedding site, their responses
          will appear here.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden px-3.5 py-3.5">
          <ul>
            {submissions.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                guests={guests}
              />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
