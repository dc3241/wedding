"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToPublicProposal } from "@/app/proposal/actions";
import { Button } from "@/components/ui/button";
import { buttonVariantClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function PublicProposalActions({
  token,
  canRespond,
}: {
  token: string;
  canRespond: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [convertNote, setConvertNote] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canRespond && !done) {
    return null;
  }

  function handle(decision: "accept" | "decline") {
    setError(null);
    startTransition(async () => {
      const result = await respondToPublicProposal(token, decision);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.status);
      if (result.status === "accepted") {
        setInvoiceUrl(result.invoicePublicUrl ?? null);
        setConvertNote(result.convertError ?? null);
      }
      router.refresh();
    });
  }

  if (done === "accepted") {
    return (
      <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
        <p className="text-[15px] font-medium text-sage">
          You&apos;ve accepted this proposal. Your planner will be in touch.
        </p>
        {convertNote ? (
          <p className="text-[13px] text-muted">
            Your acceptance was saved. Your planner will finish setting up the
            next steps.
          </p>
        ) : null}
        {invoiceUrl ? (
          <a
            href={invoiceUrl}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-5 py-2.5 text-[14px] font-semibold no-underline",
              buttonVariantClasses.primary,
            )}
          >
            View invoice
          </a>
        ) : null}
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
        <p className="text-[15px] font-medium text-muted">
          You declined this proposal. Thanks for letting them know.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => handle("accept")}
        >
          Accept proposal
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isPending}
          onClick={() => handle("decline")}
        >
          Decline
        </Button>
      </div>
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
