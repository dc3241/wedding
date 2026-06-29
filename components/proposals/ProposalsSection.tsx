"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createProposal } from "@/app/(app)/leads/[leadId]/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { ProposalBuilder } from "./ProposalBuilder";
import {
  formatProposalCurrency,
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_VARIANT,
  type Proposal,
} from "./types";

export function ProposalsSection({
  leadId,
  proposals,
}: {
  leadId: string;
  proposals: Proposal[];
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (activeId && !proposals.some((proposal) => proposal.id === activeId)) {
      setActiveId(null);
    }
  }, [activeId, proposals]);

  const activeProposal =
    proposals.find((proposal) => proposal.id === activeId) ?? null;

  function handleNewProposal() {
    setError(null);
    startTransition(async () => {
      const result = await createProposal(leadId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setActiveId(result.proposalId);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Eyebrow>Proposals</Eyebrow>
        <Button type="button" onClick={handleNewProposal} disabled={isPending}>
          {isPending ? "Creating…" : "New proposal"}
        </Button>
      </div>

      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}

      {proposals.length === 0 && !activeId ? (
        <p className="px-1 text-[13px] text-ink-muted">
          No proposals yet. Create one to quote services for this lead.
        </p>
      ) : (
        <ul className="space-y-2">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <button
                type="button"
                onClick={() => setActiveId(proposal.id)}
                className={cn(
                  "w-full rounded-lg border border-stone bg-surface px-4 py-3 text-left transition-colors hover:border-plum",
                  activeId === proposal.id && "border-plum bg-plum-tint/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-medium text-ink">
                      {proposal.title}
                    </div>
                    <div className="mt-0.5 text-[13px] tabular-nums text-ink-muted">
                      {formatProposalCurrency(proposal.total)}
                    </div>
                  </div>
                  <Pill variant={PROPOSAL_STATUS_VARIANT[proposal.status]}>
                    {PROPOSAL_STATUS_LABEL[proposal.status]}
                  </Pill>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeId && !activeProposal ? (
        <Card className="p-4 text-[13px] text-ink-muted">Loading proposal…</Card>
      ) : null}

      {activeProposal ? (
        <ProposalBuilder
          proposal={activeProposal}
          onClose={() => setActiveId(null)}
        />
      ) : null}
    </section>
  );
}
