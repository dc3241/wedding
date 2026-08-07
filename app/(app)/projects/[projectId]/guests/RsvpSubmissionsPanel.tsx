"use client";

import { useTransition } from "react";
import {
  deleteRsvpSubmission,
  setRsvpSubmissionStatus,
} from "./rsvp-submission-actions";
import type {
  RsvpAttendee,
  RsvpSubmission,
  RsvpSubmissionStatus,
} from "./rsvp-submissions";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

function formatSubmittedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
          {attendee.song_request?.trim() ? (
            <span className="block text-[13px] text-muted">
              Song: {attendee.song_request.trim()}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SubmissionRow({ submission }: { submission: RsvpSubmission }) {
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
            {submission.matched_guest_name ? (
              <span className="text-[13px] text-muted">
                · {submission.matched_guest_name}
              </span>
            ) : null}
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
}: {
  submissions: RsvpSubmission[];
}) {
  return (
    <section>
      <CollapseSection
        defaultOpen={false}
        title={
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Website responses
            </p>
            <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              RSVP responses
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              What guests submitted from your site — meals, dietary notes, and
              songs. Household RSVP status updates automatically.
            </p>
          </div>
        }
        bodyClassName="mt-4"
      >
        {submissions.length === 0 ? (
          <EmptyState>
            When guests RSVP from your published wedding site, their responses
            will appear here.
          </EmptyState>
        ) : (
          <Card className="overflow-hidden px-3.5 py-3.5">
            <ul>
              {submissions.map((submission) => (
                <SubmissionRow key={submission.id} submission={submission} />
              ))}
            </ul>
          </Card>
        )}
      </CollapseSection>
    </section>
  );
}
