"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmVendorShareArrival } from "@/app/vendor/[token]/actions";

export function ConfirmVendorShareButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    startTransition(async () => {
      setError(null);
      const result = await confirmVendorShareArrival(token);
      if (!result.ok) {
        setError("Could not confirm. Ask for a new link.");
        return;
      }
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <p className="rounded-[var(--radius-inner)] bg-well px-4 py-3 text-center text-[15px] font-medium text-sage shadow-recessed">
        You&apos;re confirmed. Thank you.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Confirming…" : "Confirm I'm coming"}
      </Button>
      {error ? (
        <p className="text-center text-[13px] font-medium text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
