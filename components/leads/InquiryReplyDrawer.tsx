"use client";

import { useEffect } from "react";
import { PendingDraftList } from "@/components/assistant/PendingDraftList";
import type { AgentDraftPreview } from "@/components/assistant/types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { acquireScrollLock, releaseScrollLock } from "@/lib/scroll-lock";

export function InquiryReplyDrawer({
  draft,
  coupleName,
  onClose,
}: {
  draft: AgentDraftPreview | null;
  coupleName: string | null;
  onClose: () => void;
}) {
  const open = draft !== null;

  useEffect(() => {
    if (!open) return;
    acquireScrollLock();
    return () => releaseScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!draft) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ink/20"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-[400px] flex-col border-l border-hairline bg-canvas shadow-raised"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-reply-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline bg-surface px-5 py-4">
          <div>
            <Eyebrow>Pending</Eyebrow>
            <h2
              id="inquiry-reply-title"
              className="mt-1 text-[20px] font-medium text-ink"
            >
              {draft.kind === "workflow_email"
                ? "Workflow email"
                : "Inquiry reply"}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {coupleName
                ? `Review the draft to ${coupleName}, then approve to send from your Gmail.`
                : "Review the draft, then approve to send from your Gmail."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[var(--radius-inner)] border border-transparent px-2 py-1 text-[13px] text-muted hover:border-hairline hover:bg-accent-wash hover:text-ink"
            aria-label={
              draft.kind === "workflow_email"
                ? "Close workflow email draft"
                : "Close reply draft"
            }
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PendingDraftList
            drafts={[draft]}
            connectReturnTo="/leads"
            bodyDisplay="full"
          />
        </div>
      </aside>
    </>
  );
}
