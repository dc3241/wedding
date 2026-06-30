"use client";

import { useTransition } from "react";
import { deleteRsvpSubmission, setRsvpSubmissionStatus } from "./rsvp-submission-actions";
import type { RsvpSubmission, RsvpSubmissionStatus } from "./rsvp-submissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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
        "border-b border-stone py-4 last:border-b-0",
        isPending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-medium text-ink">{submission.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant={submission.response === "yes" ? "sage" : "rosewood"}>
              {submission.response === "yes" ? "Yes" : "No"}
            </Pill>
            <span className="text-[13px] tabular-nums text-ink-muted">
              Party of {submission.party_size}
            </span>
            <button
              type="button"
              onClick={toggleStatus}
              disabled={isPending}
              className="text-[13px] text-ink-muted underline-offset-2 hover:text-ink hover:underline disabled:cursor-not-allowed"
            >
              {submission.status === "new" ? "Mark reviewed" : "Mark as new"}
            </button>
          </div>
        </div>
        <time
          className="shrink-0 text-[12px] text-ink-muted"
          dateTime={submission.created_at}
        >
          {formatSubmittedAt(submission.created_at)}
        </time>
      </div>
      {submission.email ? (
        <p className="mt-2 text-[13px] text-ink-muted">
          <a href={`mailto:${submission.email}`} className="hover:text-ink hover:underline">
            {submission.email}
          </a>
        </p>
      ) : null}
      {submission.message ? (
        <p className="mt-2 text-[14px] whitespace-pre-line text-ink-muted">
          {submission.message}
        </p>
      ) : null}
      <div className="mt-3">
        <Button
          type="button"
          variant="default"
          onClick={handleDelete}
          disabled={isPending}
          className="text-[13px] text-rosewood hover:text-rosewood"
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

export function RsvpSubmissionsPanel({
  submissions,
}: {
  submissions: RsvpSubmission[];
}) {
  const newCount = submissions.filter((row) => row.status === "new").length;

  return (
    <section>
      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <Eyebrow>Website responses</Eyebrow>
          <h2 className="mt-1 text-[16px] font-medium text-ink">RSVP inbox</h2>
        </div>
        {newCount > 0 ? (
          <span className="text-[13px] text-plum">
            {newCount} new response{newCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {submissions.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          When guests RSVP from your published wedding site, their responses will appear here for you
          to review.
        </p>
      ) : (
        <Card className="px-5 py-1">
          <ul>
            {submissions.map((submission) => (
              <SubmissionRow key={submission.id} submission={submission} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
