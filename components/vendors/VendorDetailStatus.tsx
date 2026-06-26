"use client";

import { useTransition } from "react";
import { updateProjectVendorStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { VendorStatusPill } from "@/components/vendors/vendor-status";

export function VendorDetailStatus({
  projectVendorId,
  status,
  quotedPrice = null,
}: {
  projectVendorId: string;
  status: string;
  quotedPrice?: number | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const cycle: Record<string, string> = {
        to_contact: "contacted",
        contacted: "booked",
        booked: "declined",
        declined: "to_contact",
      };
      const next = cycle[status] ?? "to_contact";
      await updateProjectVendorStatus(projectVendorId, next);
    });
  }

  return (
    <VendorStatusPill
      status={status}
      quotedPrice={quotedPrice}
      onClick={handleClick}
      disabled={isPending}
    />
  );
}
