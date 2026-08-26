"use client";

import { useId } from "react";
import { formatKindLabel, parseLocalDateKey } from "./calendar-source";
import type { CalendarItem } from "./types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/format-currency";

function categoryLabel(item: CalendarItem): string {
  if (item.source === "wedding") return "Wedding day";
  if (item.source === "payment") return "Payment due";
  if (item.source === "task") return "Task due";
  if (item.kind) return formatKindLabel(item.kind);
  return "Event";
}

/** Destination noun for the explicit Go-to action. */
export function goToNoun(item: CalendarItem): string | null {
  if (!item.href) return null;
  const href = item.href;
  if (item.source === "task" || href.includes("/checklist")) return "task";
  if (item.source === "payment" || href.includes("/budget")) return "budget";
  if (href.includes("/vendors")) return "vendor";
  return "linked item";
}

function formatWhen(item: CalendarItem): string {
  const date = parseLocalDateKey(item.localDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (item.timeLabel) return `${date} · ${item.timeLabel}`;
  if (item.allDay) return `${date} · All day`;
  return date;
}

function displayTitle(item: CalendarItem): string {
  if (item.source === "payment" && item.amount != null) {
    return `${formatCurrency(item.amount)} · ${item.title}`;
  }
  return item.title;
}

export function CalendarEventDetailModal({
  item,
  hideProjectName,
  onClose,
  onEdit,
}: {
  item: CalendarItem;
  hideProjectName?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const titleId = useId();
  const category = categoryLabel(item);
  const noun = goToNoun(item);
  const when = formatWhen(item);
  const title = displayTitle(item);
  const location = item.authored?.location?.trim() || null;
  const notes = item.authored?.notes?.trim() || null;
  const showProject =
    !hideProjectName && Boolean(item.projectName) && item.source !== "wedding";

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <div className="min-w-0">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>{category}</Eyebrow>
            <h2
              id={titleId}
              className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-well text-[16px] text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="text-[13px] font-medium text-muted">When</dt>
            <dd className="mt-1 text-[15px] font-medium tabular-nums text-ink">
              {when}
            </dd>
          </div>
          {showProject ? (
            <div>
              <dt className="text-[13px] font-medium text-muted">Wedding</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">
                {item.projectName}
              </dd>
            </div>
          ) : null}
          {item.pastDue ? (
            <div>
              <dt className="text-[13px] font-medium text-muted">Status</dt>
              <dd className="mt-1 text-[15px] font-medium text-rosewood">
                Overdue
              </dd>
            </div>
          ) : null}
          {location ? (
            <div>
              <dt className="text-[13px] font-medium text-muted">Location</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">
                {location}
              </dd>
            </div>
          ) : null}
          {notes ? (
            <div>
              <dt className="text-[13px] font-medium text-muted">Notes</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">{notes}</dd>
            </div>
          ) : null}
        </dl>

        {item.href || onEdit ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {item.href && noun ? (
              <ButtonLink href={item.href}>Go to {noun}</ButtonLink>
            ) : null}
            {onEdit ? (
              <Button type="button" variant="default" onClick={onEdit}>
                Edit event
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
