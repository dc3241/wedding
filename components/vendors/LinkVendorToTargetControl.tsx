"use client";

import { useState, useTransition } from "react";
import {
  linkVendorToTarget,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

export type SlotTargetOption = {
  id: string;
  category: string;
  status: "needed" | "booked" | "skipped";
  project_vendor_id: string | null;
};

export function unfilledSlotTargets(targets: SlotTargetOption[]) {
  return targets.filter(
    (t) => t.project_vendor_id == null && t.status !== "skipped",
  );
}

export function LinkVendorToTargetControl({
  projectVendorId,
  vendorCategory,
  targets,
}: {
  projectVendorId: string;
  vendorCategory: string | null;
  targets: SlotTargetOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");

  const alreadySlotted = targets.some(
    (t) => t.project_vendor_id === projectVendorId,
  );
  if (alreadySlotted) return null;

  const unfilled = unfilledSlotTargets(targets);
  if (unfilled.length === 0) return null;

  const categoryMatches = vendorCategory
    ? unfilled.filter((t) => t.category === vendorCategory)
    : [];

  function link(targetId: string) {
    startTransition(async () => {
      await linkVendorToTarget(targetId, projectVendorId);
      setPickerOpen(false);
      setPickedId("");
    });
  }

  if (categoryMatches.length === 1) {
    const target = categoryMatches[0];
    const label = vendorCategoryLabel(target.category);
    return (
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => link(target.id)}
        className="text-[13px]"
      >
        {isPending ? "Adding…" : `Add to ${label}`}
      </Button>
    );
  }

  if (!pickerOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => setPickerOpen(true)}
        className="text-[13px]"
      >
        Add to slot
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
        aria-label="Choose vendor slot"
        className="min-w-[10rem] text-[13px]"
      >
        <option value="" disabled>
          Choose slot
        </option>
        {unfilled.map((t) => (
          <option key={t.id} value={t.id}>
            {vendorCategoryLabel(t.category)}
            {t.status === "booked" ? " (booked, no vendor)" : ""}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="primary"
        disabled={isPending || !pickedId}
        onClick={() => {
          if (pickedId) link(pickedId);
        }}
        className="text-[13px]"
      >
        {isPending ? "Adding…" : "Add"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={() => {
          setPickerOpen(false);
          setPickedId("");
        }}
        className="text-[13px] text-muted"
      >
        Cancel
      </Button>
    </div>
  );
}
