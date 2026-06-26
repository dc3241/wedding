"use client";

import { useTransition } from "react";
import { updateRsvp } from "./actions";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import type { RsvpStatus } from "./types";

const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: "Pending",
  attending: "Attending",
  declined: "Declined",
};

const RSVP_VARIANT: Record<RsvpStatus, PillVariant> = {
  pending: "default",
  attending: "sage",
  declined: "rosewood",
};

const RSVP_CYCLE: Record<RsvpStatus, RsvpStatus> = {
  pending: "attending",
  attending: "declined",
  declined: "pending",
};

export function rsvpPill(status: RsvpStatus) {
  return {
    variant: RSVP_VARIANT[status],
    label: RSVP_LABEL[status],
  };
}

export function RsvpPill({
  guestId,
  status,
  className,
}: {
  guestId: string;
  status: RsvpStatus;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { variant, label } = rsvpPill(status);

  function handleClick() {
    const nextStatus = RSVP_CYCLE[status];
    startTransition(async () => {
      await updateRsvp(guestId, nextStatus);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`RSVP: ${label}. Click to change.`}
      className={cn(
        "shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <Pill variant={variant}>{label}</Pill>
    </button>
  );
}
