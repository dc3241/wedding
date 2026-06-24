"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  sendOutreach,
  updateOutreachDraft,
} from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";

export type OutreachDraft = {
  id: string;
  subject: string | null;
  body: string;
  updated_at: string;
  status: "draft" | "failed";
  sendError: string | null;
  vendorName: string;
  vendorCategory: string | null;
};

export function OutreachDraftEditor({
  draft,
  gmailConnected,
  connectHref,
}: {
  draft: OutreachDraft;
  gmailConnected: boolean;
  connectHref: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | null>(draft.sendError);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    subject !== (draft.subject ?? "") || body !== draft.body;

  function handleSave(thenSend = false) {
    startTransition(async () => {
      setError(null);
      setSaved(false);

      const result = await updateOutreachDraft(draft.id, subject, body);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSaved(true);

      if (thenSend) {
        const sendResult = await sendOutreach(draft.id);
        if (!sendResult.ok) {
          setError(sendResult.error);
          if (sendResult.needsConnect) {
            // keep saved state; user can connect and retry
          }
        }
      }

      router.refresh();
    });
  }

  function handleSend() {
    if (!gmailConnected) {
      setError("Connect Gmail before sending.");
      return;
    }

    if (isDirty) {
      handleSave(true);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await sendOutreach(draft.id);
      if (!result.ok) {
        setError(result.error);
      }
      router.refresh();
    });
  }

  return (
    <article
      className={`rounded-md border p-4 ${
        draft.status === "failed"
          ? "border-red-200 bg-red-50/30"
          : "border-zinc-200"
      }`}
    >
      <header className="mb-3">
        <h3 className="font-medium text-zinc-900">{draft.vendorName}</h3>
        <p className="text-sm text-zinc-500">
          {draft.vendorCategory ?? "Vendor"} ·{" "}
          {draft.status === "failed" ? "Send failed" : "Email draft"}
        </p>
      </header>

      <div className="space-y-3">
        <div className="space-y-1">
          <label
            htmlFor={`subject-${draft.id}`}
            className="text-xs font-medium text-zinc-600"
          >
            Subject
          </label>
          <input
            id={`subject-${draft.id}`}
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSaved(false);
            }}
            disabled={isPending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`body-${draft.id}`}
            className="text-xs font-medium text-zinc-600"
          >
            Body
          </label>
          <textarea
            id={`body-${draft.id}`}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSaved(false);
            }}
            rows={10}
            disabled={isPending}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-zinc-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isPending || !isDirty}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save draft"}
        </button>

        {gmailConnected ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send"}
          </button>
        ) : (
          <Link
            href={connectHref}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Connect Gmail to send
          </Link>
        )}

        {saved && !isDirty ? (
          <span className="text-xs text-green-700">Saved</span>
        ) : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </article>
  );
}
