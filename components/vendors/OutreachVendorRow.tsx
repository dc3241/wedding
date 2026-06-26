"use client";

import { useTransition } from "react";
import { updateProjectVendorStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { VendorListRow } from "@/components/vendors/VendorListRow";
import { VendorPipelineStepper } from "@/components/vendors/VendorPipelineStepper";
import { VendorStatusPill } from "@/components/vendors/vendor-status";
import { cn } from "@/lib/cn";

export type { OutreachVendor };

const STATUS_CYCLE: Record<OutreachVendor["status"], OutreachVendor["status"]> =
  {
    to_contact: "contacted",
    contacted: "booked",
    booked: "declined",
    declined: "to_contact",
  };

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
    const nextStatus = STATUS_CYCLE[item.status];
    startTransition(async () => {
      await updateProjectVendorStatus(item.id, nextStatus);
    });
  }

  return (
    <VendorListRow
      className={cn(isPending && "opacity-60", className)}
      name={item.vendor.name}
      category={item.vendor.category ?? "Uncategorized"}
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
            className="size-4 rounded border-stone accent-plum"
            aria-label={`Select ${item.vendor.name}`}
          />
        ) : undefined
      }
      trailing={
        <VendorStatusPill
          status={item.status}
          quotedPrice={item.quoted_price}
          onClick={handleStatusClick}
          disabled={isPending}
        />
      }
      footer={<VendorPipelineStepper status={item.status} />}
    />
  );
}
