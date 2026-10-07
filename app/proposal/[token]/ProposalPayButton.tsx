"use client";

import { useState, useTransition } from "react";
import { startPublicProposalCheckout } from "@/app/proposal/payment-actions";
import { Button } from "@/components/ui/button";
import { formatProposalCurrency } from "@/components/proposals/types";

export function ProposalPayButton({
  token,
  total,
  accountName,
  paymentStatus,
  checkoutReturned,
}: {
  token: string;
  total: number;
  accountName: string;
  paymentStatus: string | null;
  checkoutReturned: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const payee = accountName.trim() || "your planner";

  if (paymentStatus === "paid") {
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
        <p className="text-[15px] font-medium text-sage">
          {`Payment received by ${payee}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-muted">
        {`Pay ${formatProposalCurrency(total)} to ${payee}. This charge is in their name.`}
      </p>
      {checkoutReturned ? (
        <p className="text-[14px] text-muted">
          We&apos;re confirming the payment. Refresh in a moment if it doesn&apos;t
          show as received.
        </p>
      ) : null}
      <Button
        type="button"
        variant="primary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startPublicProposalCheckout(token);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.assign(result.url);
          });
        }}
      >
        {isPending ? "Starting checkout…" : `Pay ${formatProposalCurrency(total)}`}
      </Button>
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
