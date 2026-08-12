"use client";

import {
  createCoupleCheckoutSession,
  createPlannerCheckoutSession,
  createPortalSession,
} from "@/app/(app)/account/billing/actions";
import { Button } from "@/components/ui/button";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { useState } from "react";

/** PRICE-08: Monthly / Lifetime toggle + Checkout for couples. */
export function CoupleSubscribeButton() {
  const [plan, setPlan] = useState<"monthly" | "lifetime">("monthly");

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <SegmentedToggle aria-label="Couple plan" className="w-fit p-0.5">
        <SegmentedToggleItem
          type="button"
          active={plan === "monthly"}
          aria-pressed={plan === "monthly"}
          onClick={() => setPlan("monthly")}
          className="px-3 py-1 text-[12px] font-semibold"
        >
          Monthly · $10
        </SegmentedToggleItem>
        <SegmentedToggleItem
          type="button"
          active={plan === "lifetime"}
          aria-pressed={plan === "lifetime"}
          onClick={() => setPlan("lifetime")}
          className="px-3 py-1 text-[12px] font-semibold"
        >
          Lifetime · $99
        </SegmentedToggleItem>
      </SegmentedToggle>
      <form action={createCoupleCheckoutSession}>
        <input type="hidden" name="plan" value={plan} />
        <Button type="submit">Subscribe</Button>
      </form>
      <p className="max-w-[18rem] text-[13px] leading-snug text-muted sm:text-right">
        {plan === "monthly"
          ? "$10/mo — cancel anytime from billing."
          : "$99 once — no recurring charges."}
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

/** PRICE-06 / PRICE-08: open Stripe Customer Portal for a real Subscription. */
export function ManageBillingButton() {
  return (
    <form action={createPortalSession}>
      <Button type="submit" variant="default">
        Manage subscription
      </Button>
    </form>
  );
}
