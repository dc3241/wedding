"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendAllOutreachDrafts } from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";

export function SendAllDraftsButton({
  projectId,
  draftCount,
  gmailConnected,
  connectHref,
}: {
  projectId: string;
  draftCount: number;
  gmailConnected: boolean;
  connectHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (draftCount === 0) return null;

  function handleSendAll() {
    startTransition(async () => {
      setError(null);
      setSummary(null);

      const result = await sendAllOutreachDrafts(projectId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.failures.length === 0) {
        setSummary(`Sent ${result.sent} email${result.sent === 1 ? "" : "s"}.`);
      } else {
        setSummary(
          `Sent ${result.sent}. ${result.failures.length} failed — see errors below.`
        );
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {gmailConnected ? (
        <button
          type="button"
          onClick={handleSendAll}
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isPending ? "Sending…" : `Send all drafts (${draftCount})`}
        </button>
      ) : (
        <Link
          href={connectHref}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Connect Gmail to send all
        </Link>
      )}
      {summary ? (
        <span className="text-sm text-green-700">{summary}</span>
      ) : null}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
