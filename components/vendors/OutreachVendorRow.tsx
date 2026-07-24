"use client";

import { useTransition } from "react";
import {
  removeProjectVendor,
  updateProjectVendorStatus,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  OUTREACH_STATUS_CYCLE,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { VendorListRow } from "@/components/vendors/VendorListRow";
import { VendorPipelineStepper } from "@/components/vendors/VendorPipelineStepper";
import { VendorStatusPill } from "@/components/vendors/vendor-status";
import { cn } from "@/lib/cn";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

export type { OutreachVendor };

const destructiveControlClass =
  "rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50";

export function OutreachShortlistRow({
  projectId,
  item,
  selectable = false,
  selected = false,
  onToggleSelect,
  className,
}: {
  projectId: string;
  item: OutreachVendor;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusClick() {
    if (item.status === "declined") return;
    const nextStatus = OUTREACH_STATUS_CYCLE[item.status];
    startTransition(async () => {
      await updateProjectVendorStatus(item.id, nextStatus);
    });
  }

  function handleDecline() {
    startTransition(async () => {
      await updateProjectVendorStatus(item.id, "declined");
    });
  }

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${item.vendor.name} from this project?\n\nThis removes them from this project, permanently deletes their outreach message history, and unlinks them from any budget item or task.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await removeProjectVendor(item.id);
    });
  }

  return (
    <VendorListRow
      className={cn(isPending && "opacity-60", className)}
      name={item.vendor.name}
      category={
        item.vendor.category
          ? vendorCategoryLabel(item.vendor.category)
          : "Uncategorized"
      }
      href={`/projects/${projectId}/vendors/${item.vendor.id}`}
      meta={
        item.vendor.contact_email && !selectable
          ? item.vendor.contact_email
          : undefined
      }
      leading={
        selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="size-4 rounded border-ring accent-accent"
            aria-label={`Select ${item.vendor.name}`}
          />
        ) : undefined
      }
      trailing={
        <div className="flex shrink-0 items-center gap-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              aria-label={`Remove ${item.vendor.name} from this project`}
              className={destructiveControlClass}
            >
              Remove
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isPending}
              aria-label={`Decline ${item.vendor.name}`}
              className={destructiveControlClass}
            >
              Decline
            </button>
          </div>
          <div className="border-l border-hairline pl-6">
            <VendorStatusPill
              status={item.status}
              quotedPrice={item.quoted_price}
              onClick={handleStatusClick}
              disabled={isPending}
            />
          </div>
        </div>
      }
      footer={<VendorPipelineStepper status={item.status} />}
    />
  );
}
