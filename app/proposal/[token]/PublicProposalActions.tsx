"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToPublicProposal } from "@/app/proposal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [name, setName] = useState("");
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
    const signedName = name.trim().replace(/\s+/g, " ");
    if (decision === "accept" && !signedName) {
      setError("Type your name to accept.");
      return;
    }
    startTransition(async () => {
      const result = await respondToPublicProposal(
        token,
        decision,
        decision === "accept" ? signedName : undefined,
      );
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
          {`You signed this proposal as ${name.trim().replace(/\s+/g, " ")}. Your planner will be in touch.`}
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
      <div className="space-y-1.5">
        <label htmlFor="proposal-sign-name" className="text-[14px] font-medium text-ink">
          Your name
        </label>
        <Input
          id="proposal-sign-name"
          name="signed-name"
          autoComplete="name"
          maxLength={200}
          value={name}
          disabled={isPending}
          placeholder="Type your name to accept"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
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
