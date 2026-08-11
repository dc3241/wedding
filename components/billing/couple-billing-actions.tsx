"use client";

import {
  cancelCoupleTrial,
  createCoupleCheckoutSession,
  createPlannerCheckoutSession,
  createPlannerPortalSession,
  resumeCoupleTrial,
} from "@/app/(app)/account/billing/actions";
import { Button } from "@/components/ui/button";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { useState } from "react";

/** PRICE-05: stop the day-7 $92 charge; keep access through period end. */
export function CoupleTrialCancelButton() {
  return (
    <form action={cancelCoupleTrial}>
      <Button type="submit" variant="default">
        Cancel trial
      </Button>
    </form>
  );
}

/** PRICE-05: undo cancel — day-7 charge is back on. */
export function CoupleTrialResumeButton() {
  return (
    <form action={resumeCoupleTrial}>
      <Button type="submit" variant="default">
        Resume trial
      </Button>
    </form>
  );
}

/** PRICE-03: $7 trial-week Checkout (also used for lapsed reactivation). */
export function CoupleSubscribeButton() {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <form action={createCoupleCheckoutSession}>
        <Button type="submit">Start your $7 trial week</Button>
      </form>
      <p className="max-w-[18rem] text-[13px] leading-snug text-muted sm:text-right">
        $7 today, $92 on day 7 — $99 total, no recurring charges.
      </p>
    </div>
  );
}

/** PRICE-02: Monthly / Annual toggle + Checkout for planners. */
export function PlannerSubscribeButton() {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <SegmentedToggle aria-label="Billing cadence" className="w-fit p-0.5">
        <SegmentedToggleItem
          type="button"
          active={interval === "monthly"}
          aria-pressed={interval === "monthly"}
          onClick={() => setInterval("monthly")}
          className="px-3 py-1 text-[12px] font-semibold"
        >
          Monthly · $59
        </SegmentedToggleItem>
        <SegmentedToggleItem
          type="button"
          active={interval === "annual"}
          aria-pressed={interval === "annual"}
          onClick={() => setInterval("annual")}
          className="px-3 py-1 text-[12px] font-semibold"
        >
          Annual · $590
        </SegmentedToggleItem>
      </SegmentedToggle>
      <form action={createPlannerCheckoutSession}>
        <input type="hidden" name="interval" value={interval} />
        <Button type="submit">Subscribe</Button>
      </form>
    </div>
  );
}

/** PRICE-06: open Stripe Customer Portal for an existing planner Subscription. */
export function ManageBillingButton() {
  return (
    <form action={createPlannerPortalSession}>
      <Button type="submit" variant="default">
        Manage subscription
      </Button>
    </form>
  );
}
