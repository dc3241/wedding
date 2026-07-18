"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { updateProposalStatus } from "@/app/(app)/leads/[leadId]/actions";
import { PROPOSAL_STATUSES, PROPOSAL_STATUS_LABEL, type ProposalStatus } from "./types";
import { cn } from "@/lib/cn";

const ACTIVE_CLASS: Record<ProposalStatus, string> = {
  draft: "bg-canvas text-muted",
  sent: "bg-surface text-clay",
  accepted: "bg-surface text-sage",
  declined: "bg-surface text-rosewood",
};

export function ProposalStatusControl({
  proposalId,
  initialStatus,
}: {
  proposalId: string;
  initialStatus: ProposalStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function handleSelect(next: ProposalStatus) {
    if (next === status || isPending) return;

    const previous = status;
    setError(null);
    setStatus(next);

    startTransition(async () => {
      const result = await updateProposalStatus(proposalId, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div
        role="tablist"
        aria-label="Proposal status"
        className={cn(
          "flex flex-wrap rounded-full border border-ring bg-surface p-[3px]",
          isPending && "opacity-60",
        )}
      >
        {PROPOSAL_STATUSES.map((value) => {
          const active = status === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={isPending}
              onClick={() => handleSelect(value)}
              className={cn(
                "cursor-pointer rounded-full border-none bg-transparent px-2.5 py-1 text-[12px] font-medium text-muted transition-[color,background] duration-150 disabled:cursor-not-allowed",
                active && ACTIVE_CLASS[value],
              )}
            >
              {PROPOSAL_STATUS_LABEL[value]}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-[11px] text-rosewood">{error}</p> : null}
    </div>
  );
}
