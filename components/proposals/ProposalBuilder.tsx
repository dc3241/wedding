"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteProposal,
  updateProposal,
} from "@/app/(app)/leads/[leadId]/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { ProposalStatusControl } from "./ProposalStatusControl";
import {
  computeProposalTotal,
  formatProposalCurrency,
  type Proposal,
  type ProposalLineItem,
} from "./types";

function emptyLineItem(): ProposalLineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit_price: 0,
  };
}

function formatAcceptedAt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ProposalBuilder({
  proposal,
  onClose,
}: {
  proposal: Proposal;
  onClose: () => void;
}) {
  const router = useRouter();
  const isLocked = proposal.status === "accepted";
  const [title, setTitle] = useState(proposal.title);
  const [notes, setNotes] = useState(proposal.notes ?? "");
  const [terms, setTerms] = useState(proposal.terms ?? "");
  const [lineItems, setLineItems] = useState<ProposalLineItem[]>(
    proposal.line_items.length > 0 ? proposal.line_items : [emptyLineItem()],
  );
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(proposal.title);
    setNotes(proposal.notes ?? "");
    setTerms(proposal.terms ?? "");
    setLineItems(
      proposal.line_items.length > 0 ? proposal.line_items : [emptyLineItem()],
    );
  }, [proposal]);

  const liveTotal = isLocked
    ? proposal.total
    : computeProposalTotal(
        lineItems.filter((item) => item.description.trim()),
      );

  function updateLineItem(id: string, patch: Partial<ProposalLineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, emptyLineItem()]);
  }

  function removeLineItem(id: string) {
    setLineItems((items) => {
      const next = items.filter((item) => item.id !== id);
      return next.length > 0 ? next : [emptyLineItem()];
    });
  }

  function handleSave() {
    setError(null);
    setSaveMessage(null);

    const validItems = lineItems
      .map((item) => ({
        ...item,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      }))
      .filter((item) => item.description);

    startTransition(async () => {
      const result = await updateProposal(proposal.id, {
        title,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        line_items: validItems,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSaveMessage("Saved");
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete proposal "${proposal.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteProposal(proposal.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Card className={cn("p-5", isPending && "opacity-60")}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          {isLocked ? (
            <div>
              <h2 className="text-[15px] font-medium text-ink">{title}</h2>
              {proposal.accepted_at ? (
                <p className="mt-1 text-[13px] text-sage">
                  Accepted {formatAcceptedAt(proposal.accepted_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label
                htmlFor={`proposal-title-${proposal.id}`}
                className="text-sm font-medium text-ink"
              >
                Title
              </label>
              <Input
                id={`proposal-title-${proposal.id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
              />
            </div>
          )}
          <ProposalStatusControl
            proposalId={proposal.id}
            initialStatus={proposal.status}
          />
        </div>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Close
        </Button>
      </div>

      {isLocked ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <ButtonLink
            href={`/leads/${proposal.lead_id}/proposals/${proposal.id}/contract`}
            variant="primary"
          >
            View contract
          </ButtonLink>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-ink">Line items</h3>
          {!isLocked ? (
            <Button
              type="button"
              variant="default"
              onClick={addLineItem}
              disabled={isPending}
            >
              Add line
            </Button>
          ) : null}
        </div>

        {isLocked ? (
          <ul className="divide-y divide-hairline rounded-[var(--radius-inner)] border border-hairline">
            {proposal.line_items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-[14px]"
              >
                <span className="text-ink">{item.description}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {item.quantity} × {formatProposalCurrency(item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {lineItems.map((item) => (
              <li
                key={item.id}
                className="grid gap-2 rounded-[var(--radius-inner)] border border-ring bg-canvas p-3 sm:grid-cols-[1fr_88px_120px_auto]"
              >
                <Input
                  aria-label="Description"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(item.id, { description: e.target.value })
                  }
                  disabled={isPending}
                />
                <Input
                  aria-label="Quantity"
                  type="number"
                  min={0}
                  step={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateLineItem(item.id, {
                      quantity: Number(e.target.value),
                    })
                  }
                  disabled={isPending}
                />
                <Input
                  aria-label="Unit price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unit_price}
                  onChange={(e) =>
                    updateLineItem(item.id, {
                      unit_price: Number(e.target.value),
                    })
                  }
                  disabled={isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => removeLineItem(item.id)}
                  className="text-muted hover:text-rosewood"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-sm text-muted">Total</span>
          <span className="text-lg font-medium tabular-nums text-ink">
            {formatProposalCurrency(liveTotal)}
          </span>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`proposal-terms-${proposal.id}`}
            className="text-sm font-medium text-ink"
          >
            Contract terms
          </label>
          {isLocked ? (
            terms ? (
              <p className="whitespace-pre-wrap rounded-[var(--radius-inner)] border border-hairline bg-canvas px-3 py-2 text-[14px] text-muted">
                {terms}
              </p>
            ) : (
              <p className="text-[13px] text-muted">No terms specified.</p>
            )
          ) : (
            <Textarea
              id={`proposal-terms-${proposal.id}`}
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={isPending}
              placeholder="Payment schedule, cancellation policy, scope of services…"
            />
          )}
        </div>

        {!isLocked ? (
          <div className="space-y-1.5">
            <label
              htmlFor={`proposal-notes-${proposal.id}`}
              className="text-sm font-medium text-ink"
            >
              Internal notes
            </label>
            <Textarea
              id={`proposal-notes-${proposal.id}`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="Internal notes about this proposal…"
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-[13px] text-rosewood">{error}</p> : null}
      {saveMessage ? (
        <p className="mt-3 text-[13px] text-sage">{saveMessage}</p>
      ) : null}

      {!isLocked ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={handleDelete}
            className="text-muted hover:text-rosewood"
          >
            Delete proposal
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-muted">
          This proposal is locked. Change status to Draft to edit again.
        </p>
      )}
    </Card>
  );
}
