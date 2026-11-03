"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  applyAssistantProposal,
  rejectAssistantProposal,
} from "@/components/assistant/proposal-actions";
import type { AssistantProposalPreview } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";

export function PendingProposalList({
  proposals,
}: {
  proposals: AssistantProposalPreview[];
}) {
  const router = useRouter();
  if (proposals.length === 0) return null;

  return (
    <ul className="mt-3 space-y-3">
      {proposals.map((proposal) => (
        <ProposalRow
          key={proposal.id}
          proposal={proposal}
          onSettled={() => router.refresh()}
        />
      ))}
    </ul>
  );
}

function ProposalRow({
  proposal,
  onSettled,
}: {
  proposal: AssistantProposalPreview;
  onSettled: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: "apply" | "reject") {
    startTransition(async () => {
      setError(null);
      const result =
        action === "apply"
          ? await applyAssistantProposal(proposal.id)
          : await rejectAssistantProposal(proposal.id);
      if (!result.ok) {
        setError(result.error);
        // A stale or already-handled proposal leaves the list on refresh.
        onSettled();
        return;
      }
      onSettled();
    });
  }

  return (
    <li className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
        {proposal.kind === "vendor_quote"
          ? "Vendor reply"
          : proposal.kind === "checklist_replan"
            ? "Checklist update"
            : proposal.kind === "rsvp_reminder"
              ? "RSVP reminder"
              : "Budget suggestion"}
      </p>
      <h3 className="mt-1 text-[15px] font-medium text-ink">{proposal.title}</h3>
      {proposal.summary ? (
        <p className="mt-1 text-[13px] text-muted">{proposal.summary}</p>
      ) : null}
      <ul className="mt-2 space-y-1 text-[14px] text-ink">
        {proposal.lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      {error ? (
        <p className="mt-2 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => run("apply")}
        >
          {proposal.kind === "vendor_quote"
            ? "Save quote"
            : proposal.kind === "rsvp_reminder"
              ? "Send reminders"
              : "Apply"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={() => run("reject")}
        >
          Dismiss
        </Button>
      </div>
    </li>
  );
}
