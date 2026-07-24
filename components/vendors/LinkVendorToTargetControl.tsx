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
  /** Display name of the vendor currently on this slot, if any. */
  linkedVendorName?: string | null;
};

/** Slots this vendor can attach to — skipped excluded; own slots excluded. */
export function linkableSlotTargets(
  targets: SlotTargetOption[],
  projectVendorId: string,
) {
  return targets.filter(
    (t) =>
      t.status !== "skipped" && t.project_vendor_id !== projectVendorId,
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

  const linkable = linkableSlotTargets(targets, projectVendorId);
  if (linkable.length === 0) return null;

  const emptyMatches = vendorCategory
    ? linkable.filter(
        (t) => t.category === vendorCategory && t.project_vendor_id == null,
      )
    : [];

  function link(targetId: string) {
    const target = targets.find((t) => t.id === targetId);
    if (!target) return;

    if (target.project_vendor_id != null) {
      const categoryLabel = vendorCategoryLabel(target.category);
      const outgoing = target.linkedVendorName?.trim() || "the current vendor";
      const ok = window.confirm(`Replace ${outgoing} on ${categoryLabel}?`);
      if (!ok) return;
    }

    startTransition(async () => {
      await linkVendorToTarget(targetId, projectVendorId);
      setPickerOpen(false);
      setPickedId("");
    });
  }

  if (emptyMatches.length === 1) {
    const target = emptyMatches[0];
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
        {linkable.map((t) => {
          const label = vendorCategoryLabel(t.category);
          const occupied =
            t.project_vendor_id != null && t.linkedVendorName
              ? ` (now ${t.linkedVendorName})`
              : t.status === "booked" && t.project_vendor_id == null
                ? " (booked, no vendor)"
                : "";
          return (
            <option key={t.id} value={t.id}>
              {label}
              {occupied}
            </option>
          );
        })}
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
