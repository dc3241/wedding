"use client";

import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { beginVendorShareClaim } from "@/lib/vendors/claim-actions";
import type { VendorShareClaimStatus } from "@/lib/vendors/claimed-shares";

export function SaveVendorShareControl({
  token,
  status,
}: {
  token: string;
  status: VendorShareClaimStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "mine") {
    return (
      <div className="space-y-3">
        <p className="text-[15px] font-medium text-sage">
          Saved to your vendor home.
        </p>
        <ButtonLink href="/vendor-home" variant="default" className="w-full">
          Open saved weddings
        </ButtonLink>
      </div>
    );
  }

  if (status === "other") {
    return (
      <p className="text-[15px] font-medium text-muted">
        This wedding is already saved on another login.
      </p>
    );
  }

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await beginVendorShareClaim(token);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[15px] font-medium text-muted">
        Optional. The link keeps working either way.
      </p>
      <Button
        type="button"
        variant="default"
        onClick={handleSave}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Saving…" : "Save this wedding"}
      </Button>
      {error ? (
        <p className="text-center text-[13px] font-medium text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
