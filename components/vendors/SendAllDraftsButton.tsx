"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendAllOutreachDrafts } from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";
import { Button, ButtonLink } from "@/components/ui/button";

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
        const uniqueErrors = [
          ...new Set(result.failures.map((f) => f.error)),
        ];
        setSummary(
          `Sent ${result.sent}. ${result.failures.length} failed — ${uniqueErrors.join(" · ")}`,
        );
        setError(uniqueErrors[0] ?? null);
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {gmailConnected ? (
        <Button type="button" onClick={handleSendAll} disabled={isPending}>
          {isPending ? "Sending…" : `Send all drafts (${draftCount})`}
        </Button>
      ) : (
        <ButtonLink href={connectHref}>Connect Gmail to send all</ButtonLink>
      )}
      {summary && !error ? (
        <span className="text-sm text-sage">{summary}</span>
      ) : null}
      {error ? (
        <span className="max-w-xl text-sm text-rosewood">{summary ?? error}</span>
      ) : null}
    </div>
  );
}
