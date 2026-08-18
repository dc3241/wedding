"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveAgentDraft,
  rejectAgentDraft,
} from "@/components/assistant/draft-actions";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Button, ButtonLink } from "@/components/ui/button";

function previewBody(body: string | null): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= 160) return text;
  return `${text.slice(0, 160).trimEnd()}…`;
}

export function PendingDraftList({
  drafts,
  connectReturnTo,
  bodyDisplay = "preview",
}: {
  drafts: AgentDraftPreview[];
  connectReturnTo: string;
  bodyDisplay?: "preview" | "full";
}) {
  const router = useRouter();
  const connectHref = `/auth/google?returnTo=${encodeURIComponent(
    connectReturnTo,
  )}`;

  if (drafts.length === 0) return null;

  return (
    <ul className="mt-3 space-y-3">
      {drafts.map((draft) => (
        <PendingDraftRow
          key={draft.id}
          draft={draft}
          connectHref={connectHref}
          bodyDisplay={bodyDisplay}
          onSettled={() => router.refresh()}
        />
      ))}
    </ul>
  );
}

function PendingDraftRow({
  draft,
  connectHref,
  bodyDisplay,
  onSettled,
}: {
  draft: AgentDraftPreview;
  connectHref: string;
  bodyDisplay: "preview" | "full";
  onSettled: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isApproved = draft.status === "approved";
  const preview = previewBody(draft.body);

  function run(action: "approve" | "reject") {
    startTransition(async () => {
      setError(null);
      setNeedsConnect(false);
      const result =
        action === "approve"
          ? await approveAgentDraft(draft.id)
          : await rejectAgentDraft(draft.id);
      if (!result.ok) {
        setError(result.error);
        setNeedsConnect(Boolean(result.needsConnect));
        return;
      }
      onSettled();
    });
  }

  return (
    <li className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
        {draft.targetLabel}
      </p>
      <h3 className="mt-1 text-[15px] font-medium text-ink">
        {draft.subject?.trim() || "Untitled draft"}
      </h3>
      {bodyDisplay === "full" && draft.body?.trim() ? (
        <p className="mt-2 whitespace-pre-wrap text-[15px] text-ink">
          {draft.body.trim()}
        </p>
      ) : preview ? (
        <p className="mt-1 text-[13px] text-muted">{preview}</p>
      ) : null}
      {isApproved ? (
        <p className="mt-2 text-[13px] text-clay">
          Approved but not sent. Retry after reconnecting Gmail if needed.
        </p>
      ) : null}
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
          onClick={() => run("approve")}
        >
          {isApproved ? "Retry send" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={() => run("reject")}
        >
          Reject
        </Button>
        {needsConnect ? (
          <ButtonLink href={connectHref} variant="secondary">
            Connect Gmail
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}
