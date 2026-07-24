"use client";

import { useTransition } from "react";
import { updateProjectVendorStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  LinkVendorToTargetControl,
  type SlotTargetOption,
} from "@/components/vendors/LinkVendorToTargetControl";
import {
  OUTREACH_STATUS_CYCLE,
} from "@/components/vendors/outreach-vendor";
import { VendorStatusPill } from "@/components/vendors/vendor-status";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

export function VendorDetailStatus({
  projectVendorId,
  status,
  quotedPrice = null,
  vendorCategory = null,
  slotTargets = [],
}: {
  projectVendorId: string;
  status: string;
  quotedPrice?: number | null;
  vendorCategory?: string | null;
  slotTargets?: SlotTargetOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const covered = slotTargets.filter(
    (t) => t.project_vendor_id === projectVendorId,
  );
  const coversLabel = covered
    .map((t) => vendorCategoryLabel(t.category))
    .join(" · ");

  function handleClick() {
    if (status === "declined") return;
    startTransition(async () => {
      const next =
        OUTREACH_STATUS_CYCLE[
          status as keyof typeof OUTREACH_STATUS_CYCLE
        ] ?? "to_contact";
      await updateProjectVendorStatus(projectVendorId, next);
    });
  }

  function handleDecline() {
    startTransition(async () => {
      await updateProjectVendorStatus(projectVendorId, "declined");
    });
  }

  function handleRestore() {
    startTransition(async () => {
      await updateProjectVendorStatus(projectVendorId, "to_contact");
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <VendorStatusPill
        status={status}
        quotedPrice={quotedPrice}
        onClick={status === "declined" ? undefined : handleClick}
        disabled={isPending}
      />
      {status === "declined" ? (
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          Return to outreach
        </button>
      ) : (
        <button
          type="button"
          onClick={handleDecline}
          disabled={isPending}
          className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:opacity-50"
        >
          Decline
        </button>
      )}
      {status === "booked" && covered.length > 0 ? (
        <p className="max-w-[14rem] text-right text-[13px] text-muted">
          Covers {coversLabel}
        </p>
      ) : null}
      {status === "booked" && covered.length === 0 ? (
        <LinkVendorToTargetControl
          projectVendorId={projectVendorId}
          vendorCategory={vendorCategory}
          targets={slotTargets}
        />
      ) : null}
    </div>
  );
}
