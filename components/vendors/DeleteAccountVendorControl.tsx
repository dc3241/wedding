"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccountVendor } from "@/app/(app)/vendors/actions";

const LINKED_REASON =
  "This vendor is linked to a wedding and can’t be deleted from the library.";

export function DeleteAccountVendorControl({
  vendorId,
  vendorName,
  linkCount,
}: {
  vendorId: string;
  vendorName: string;
  linkCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canDelete = linkCount === 0;
  const reasonId = "delete-account-vendor-reason";

  function handleDelete() {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete "${vendorName}" from the vendor library? This cannot be undone.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteAccountVendor(vendorId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/vendors");
    });
  }

  return (
    <div className="mt-5 border-t border-hairline pt-5">
      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete || isPending}
        aria-describedby={canDelete ? undefined : reasonId}
        className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete from library"}
      </button>
      {canDelete ? null : (
        <p id={reasonId} className="mt-2 text-[13px] text-muted">
          {LINKED_REASON}
        </p>
      )}
      {error ? (
        <p className="mt-2 text-[13px] font-medium text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
