"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveAgentDraft,
  approveAgentDrafts,
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
    <>
      {drafts.length >= 2 ? (
        <ApproveAllBar
          drafts={drafts}
          connectHref={connectHref}
          onSettled={() => router.refresh()}
        />
      ) : null}
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
    </>
  );
}

function ApproveAllBar({
  drafts,
  connectHref,
  onSettled,
}: {
  drafts: AgentDraftPreview[];
  connectHref: string;
  onSettled: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [isPending, startTransition] = useTransition();

  function approveAll() {
    startTransition(async () => {
      setMessage(null);
      setFailed(false);
      setNeedsConnect(false);
      const result = await approveAgentDrafts(drafts.map((d) => d.id));
      const notSent = result.failed.length;
      if (notSent === 0) {
        setMessage(
          `Sent ${result.approved} ${result.approved === 1 ? "message" : "messages"}.`,
        );
      } else {
        setFailed(true);
        setNeedsConnect(result.needsConnect);
        setMessage(
          result.approved > 0
            ? `Sent ${result.approved}. ${notSent} couldn't send: ${result.failed[0]!.error}`
            : `Couldn't send: ${result.failed[0]!.error}`,
        );
      }
      onSettled();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-inner)] border border-hairline px-3 py-2">
      <p className="min-w-0 flex-1 text-[13px] text-muted">
        {isPending
          ? "Sending…"
          : `Reject any you don't want, then send the rest at once.`}
      </p>
      <Button
        type="button"
        variant="primary"
        disabled={isPending}
        onClick={approveAll}
      >
        Approve all ({drafts.length})
      </Button>
      {needsConnect ? (
        <ButtonLink href={connectHref} variant="secondary">
          Connect Gmail
        </ButtonLink>
      ) : null}
      {message ? (
        <p
          className={`w-full text-[13px] ${failed ? "text-rosewood" : "text-sage"}`}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
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
