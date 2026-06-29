"use client";

import {
  createBillingPortalSession,
  createCoupleCheckoutSession,
  createPlannerCheckoutSession,
} from "@/app/(app)/account/billing/actions";
import { Button } from "@/components/ui/button";

export function CoupleSubscribeButton() {
  return (
    <form action={createCoupleCheckoutSession}>
      <Button type="submit">Subscribe</Button>
    </form>
  );
}

export function PlannerSubscribeButton() {
  return (
    <form action={createPlannerCheckoutSession}>
      <Button type="submit">Subscribe</Button>
    </form>
  );
}

export function ManageBillingButton() {
  return (
    <form action={createBillingPortalSession}>
      <Button type="submit" variant="default">
        Manage billing
      </Button>
    </form>
  );
}
