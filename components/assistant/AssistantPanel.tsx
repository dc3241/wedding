"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useAssistant } from "@/components/assistant/assistant-context";
import { sendAssistantMessage } from "@/components/assistant/actions";
import type { AssistantMessage } from "@/components/assistant/types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Textarea } from "@/components/ui/textarea";
import type { AccountKind } from "@/lib/account-context";
import { isPlannerAccount } from "@/lib/density";
import { cn } from "@/lib/cn";

type AssistantPanelProps = {
  projectId: string;
  accountKind: AccountKind;
  initialMessages: AssistantMessage[];
};

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AssistantPanel({
  projectId,
  accountKind,
  initialMessages,
}: AssistantPanelProps) {
  const isPlanner = isPlannerAccount(accountKind);
  const { open, closeAssistant, pendingPrefill, clearPendingPrefill } =
    useAssistant();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!open || !pendingPrefill) return;
    setInput(pendingPrefill);
    clearPendingPrefill();
  }, [open, pendingPrefill, clearPendingPrefill]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, open, isPending]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;

    const optimisticUser: AssistantMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, optimisticUser]);

    startTransition(async () => {
      const result = await sendAssistantMessage(projectId, text);
      if (!result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setError(result.error);
        setInput(text);
        return;
      }

      const now = new Date().toISOString();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        { ...optimisticUser, id: `saved-user-${Date.now()}` },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          created_at: now,
        },
      ]);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-ink/20"
          onClick={closeAssistant}
          aria-hidden
        />
      ) : null}

      <aside
        id="assistant-panel"
        className={cn(
          "fixed right-0 top-0 z-40 flex h-full w-full max-w-[400px] flex-col border-l border-stone bg-porcelain shadow-lg transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
          isPlanner && "max-w-[380px]",
        )}
        aria-hidden={!open}
      >
        <header
          className={cn(
            "flex shrink-0 items-start justify-between gap-3 border-b border-stone bg-surface px-5 py-4",
            isPlanner && "px-4 py-3",
          )}
        >
          <div>
            <Eyebrow>Assistant</Eyebrow>
            <h2 className="mt-1 text-[20px] font-medium text-ink">
              {isPlanner ? "Planning assistant" : "Your wedding assistant"}
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              {isPlanner
                ? "Ask about checklist, budget, guests, vendors, and notes for this wedding."
                : "Ask me about your checklist, budget, guests, vendors, or notes."}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAssistant}
            className="shrink-0 rounded border border-transparent px-2 py-1 text-[13px] text-ink-muted hover:border-stone hover:bg-plum-tint hover:text-ink"
            aria-label="Close assistant"
          >
            Close
          </button>
        </header>

        <div
          ref={listRef}
          className={cn(
            "flex-1 overflow-y-auto px-5 py-4",
            isPlanner && "px-4 py-3",
          )}
        >
          {messages.length === 0 && !isPending ? (
            <div
              className={cn(
                "rounded-lg border border-dashed border-stone bg-surface px-4 py-6 text-center",
                isPlanner ? "py-5" : "py-8",
              )}
            >
              <p className="text-[15px] text-ink">
                {isPlanner
                  ? "What would you like to know about this wedding?"
                  : "Hi! I'm here to help with your wedding planning."}
              </p>
              <p className="mt-2 text-[13px] text-ink-muted">
                Try &ldquo;What&apos;s overdue?&rdquo;, &ldquo;How much budget is
                left?&rdquo;, or &ldquo;Who hasn&apos;t RSVP&apos;d?&rdquo;
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={cn(
                    "flex flex-col",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-lg border px-3.5 py-2.5 text-[15px] leading-relaxed",
                      message.role === "user"
                        ? "border-plum bg-plum text-surface"
                        : "border-stone bg-surface text-ink",
                      isPlanner && "text-[14px] px-3 py-2",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <time
                    className="mt-1 text-[11px] text-ink-muted"
                    dateTime={message.created_at}
                  >
                    {formatMessageTime(message.created_at)}
                  </time>
                </li>
              ))}
              {isPending ? (
                <li className="flex items-start">
                  <div className="rounded-lg border border-stone bg-surface px-3.5 py-2.5 text-[14px] text-ink-muted">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-1.5 animate-pulse rounded-full bg-plum" />
                      Thinking…
                    </span>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <footer
          className={cn(
            "shrink-0 border-t border-stone bg-surface px-5 py-4",
            isPlanner && "px-4 py-3",
          )}
        >
          {error ? (
            <p className="mb-3 text-[13px] text-rosewood" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isPlanner
                  ? "Ask about this wedding…"
                  : "Ask about your wedding…"
              }
              rows={isPlanner ? 2 : 3}
              disabled={isPending}
              className={cn("resize-none", isPlanner && "text-[14px]")}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleSend}
                disabled={isPending || !input.trim()}
              >
                {isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </footer>
      </aside>
    </>
  );
}
