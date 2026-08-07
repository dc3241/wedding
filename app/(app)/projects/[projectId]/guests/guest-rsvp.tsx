"use client";

import { useTransition } from "react";
import { updateRsvp } from "./actions";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { RsvpStatus } from "./types";
import { RSVP_STATUSES } from "./types";

const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: "Pending",
  attending: "Attending",
  declined: "Declined",
};

const RSVP_TRIGGER_COLOR: Record<RsvpStatus, string> = {
  attending: "text-sage",
  pending: "text-clay",
  declined: "text-rosewood",
};

export function RsvpSelect({
  guestId,
  status,
  className,
}: {
  guestId: string;
  status: RsvpStatus;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      aria-label="RSVP status"
      onChange={(e) => {
        const next = e.target.value as RsvpStatus;
        if (!RSVP_STATUSES.includes(next) || next === status) return;
        startTransition(async () => {
          await updateRsvp(guestId, next);
        });
      }}
      className={cn(
        "bg-surface py-2 text-[14px]",
        RSVP_TRIGGER_COLOR[status],
        className,
      )}
    >
      {RSVP_STATUSES.map((value) => (
        <option key={value} value={value}>
          {RSVP_LABEL[value]}
        </option>
      ))}
    </Select>
  );
}
