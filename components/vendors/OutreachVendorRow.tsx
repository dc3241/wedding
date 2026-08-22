"use client";

import { useTransition } from "react";
import {
  removeProjectVendor,
  updateProjectVendorStatus,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  IN_FLIGHT_STATUSES,
  OUTREACH_ADVANCE_LABEL,
  OUTREACH_STATUS_CYCLE,
  type InFlightStatus,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { cn } from "@/lib/cn";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import Link from "next/link";

export type { OutreachVendor };

const destructiveControlClass =
  "rounded-[var(--radius-inner)] px-2 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50 sm:px-2.5";

/** Short advance labels — mobile only, so the name column keeps width. */
const ADVANCE_LABEL_COMPACT: Record<InFlightStatus, string> = {
  to_contact: "Contacted",
  contacted: "Replied",
  replied: "Booked",
};

function isInFlightStatus(status: OutreachVendor["status"]): status is InFlightStatus {
  return (IN_FLIGHT_STATUSES as readonly string[]).includes(status);
}

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

  function handleAdvance() {
    if (!isInFlightStatus(item.status)) return;
    const nextStatus = OUTREACH_STATUS_CYCLE[item.status];
    startTransition(async () => {
      await updateProjectVendorStatus(item.id, nextStatus);
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

  const category = item.vendor.category
    ? vendorCategoryLabel(item.vendor.category)
    : "Uncategorized";

  const advanceLabel = isInFlightStatus(item.status)
    ? OUTREACH_ADVANCE_LABEL[item.status]
    : null;
  const compactAdvanceLabel = isInFlightStatus(item.status)
    ? ADVANCE_LABEL_COMPACT[item.status]
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-inner)] bg-well px-3 py-2.5 shadow-recessed sm:gap-3 sm:px-3.5",
        isPending && "opacity-60",
        className,
      )}
    >
      {selectable ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="size-4 shrink-0 rounded border-ring accent-accent"
          aria-label={`Select ${item.vendor.name}`}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <Link
          href={`/projects/${projectId}/vendors/${item.vendor.id}`}
          className="block truncate text-[15px] font-medium text-ink hover:text-accent"
        >
          {item.vendor.name}
        </Link>
        <p className="truncate text-[13px] text-muted">{category}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
        {advanceLabel && compactAdvanceLabel ? (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isPending}
            className="rounded-[var(--radius-inner)] px-2 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 sm:px-2.5"
          >
            <span className="sm:hidden">{compactAdvanceLabel}</span>
            <span className="hidden sm:inline">{advanceLabel}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending}
          aria-label={`Remove ${item.vendor.name} from this project`}
          className={cn(
            destructiveControlClass,
            "max-sm:flex max-sm:size-8 max-sm:items-center max-sm:justify-center max-sm:px-0",
          )}
        >
          <span className="sm:hidden" aria-hidden>
            <svg
              viewBox="0 0 12 12"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </span>
          <span className="hidden sm:inline">Remove</span>
        </button>
      </div>
    </div>
  );
}
