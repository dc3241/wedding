"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markVendorShareOwnerRead } from "@/lib/vendors/share-message-actions";
import {
  VENDOR_SHARE_MESSAGE_MAX,
  type VendorShareMessage,
} from "@/lib/vendors/share-messages";
import { cn } from "@/lib/cn";

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function VendorShareInbox({
  messages,
  viewer,
  ownerLabel,
  vendorLabel,
  onSend,
  markReadId = null,
  className,
}: {
  messages: VendorShareMessage[];
  viewer: "owner" | "vendor";
  ownerLabel: string;
  vendorLabel: string;
  onSend: (body: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  markReadId?: string | null;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!markReadId) return;
    void markVendorShareOwnerRead(markReadId);
  }, [markReadId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) {
      setError("Write a message first.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await onSend(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
    });
  }

  return (
    <div id="messages" className={cn("space-y-3", className)}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Messages
      </p>
      {messages.length === 0 ? (
        <p className="text-[13px] text-muted">
          No messages yet. This is an email-style thread — not a live chat.
        </p>
      ) : (
        <ul className="space-y-2">
          {messages.map((message) => {
            const mine = message.author === viewer;
            const name =
              message.author === "vendor" ? vendorLabel : ownerLabel;
            return (
              <li
                key={message.id}
                className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">
                    {mine ? "You" : name}
                  </p>
                  <p className="text-[12px] tabular-nums text-muted">
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[15px] font-medium text-ink">
                  {message.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-[13px] font-medium text-muted">
          New message
          <Textarea
            rows={3}
            value={draft}
            maxLength={VENDOR_SHARE_MESSAGE_MAX}
            disabled={isPending}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            placeholder="Write a message…"
            className="mt-1 bg-surface"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] tabular-nums text-muted">
            {draft.trim().length}/{VENDOR_SHARE_MESSAGE_MAX}
          </p>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="px-3 py-1.5 text-[13px]"
          >
            {isPending ? "Sending…" : "Send"}
          </Button>
        </div>
        {error ? (
          <p className="text-[13px] font-medium text-rosewood" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
