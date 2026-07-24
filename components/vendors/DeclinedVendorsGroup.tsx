"use client";

import { useState, useTransition } from "react";
import { updateProjectVendorStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { VendorListRow } from "@/components/vendors/VendorListRow";
import { VendorStatusPill } from "@/components/vendors/vendor-status";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";

export function DeclinedVendorsGroup({
  projectId,
  items,
}: {
  projectId: string;
  items: OutreachVendor[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function restore(projectVendorId: string) {
    startTransition(async () => {
      await updateProjectVendorStatus(projectVendorId, "to_contact");
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-raised">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Declined ({items.length})
        </p>
        <span className="text-[13px] font-medium text-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <ul className={cn("space-y-2 px-3.5 pb-3.5", isPending && "opacity-60")}>
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed"
            >
              <VendorListRow
                name={item.vendor.name}
                category={
                  item.vendor.category
                    ? vendorCategoryLabel(item.vendor.category)
                    : "Uncategorized"
                }
                href={`/projects/${projectId}/vendors/${item.vendor.id}`}
                trailing={
                  <div className="flex shrink-0 items-center gap-6">
                    <button
                      type="button"
                      onClick={() => restore(item.id)}
                      disabled={isPending}
                      className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-well hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
                    >
                      Return to outreach
                    </button>
                    <div className="border-l border-hairline pl-6">
                      <VendorStatusPill status="declined" />
                    </div>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
