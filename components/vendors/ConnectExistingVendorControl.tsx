"use client";

import { useState, useTransition } from "react";
import { linkVendorToTarget } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

export type ConnectableBookedVendor = {
  projectVendorId: string;
  name: string;
  /** Category ids this vendor already covers. */
  coveredCategories: string[];
};

export function ConnectExistingVendorControl({
  targetId,
  vendors,
}: {
  targetId: string;
  vendors: ConnectableBookedVendor[];
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");

  if (vendors.length === 0) return null;

  function connect(projectVendorId: string) {
    startTransition(async () => {
      await linkVendorToTarget(targetId, projectVendorId);
      setOpen(false);
      setPickedId("");
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="text-[13px]"
      >
        Connect existing vendor
      </Button>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Select
        value={pickedId}
        onChange={(e) => setPickedId(e.target.value)}
        disabled={isPending}
        aria-label="Choose existing vendor"
        className="min-w-[12rem] text-[13px]"
      >
        <option value="" disabled>
          Choose vendor
        </option>
        {vendors.map((v) => {
          const covers =
            v.coveredCategories.length > 0
              ? ` · ${v.coveredCategories
                  .map((c) => vendorCategoryLabel(c))
                  .join(" · ")}`
              : "";
          return (
            <option key={v.projectVendorId} value={v.projectVendorId}>
              {v.name}
              {covers}
            </option>
          );
        })}
      </Select>
      <Button
        type="button"
        variant="primary"
        disabled={isPending || !pickedId}
        onClick={() => {
          if (pickedId) connect(pickedId);
        }}
        className="text-[13px]"
      >
        {isPending ? "Connecting…" : "Connect"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          setOpen(false);
          setPickedId("");
        }}
        className="text-[13px] text-muted"
      >
        Cancel
      </Button>
    </div>
  );
}
