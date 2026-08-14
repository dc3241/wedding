import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CoupleSubscribeButton,
  ManageBillingButton,
  PlannerSubscribeButton,
} from "@/components/billing/couple-billing-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import {
  getCoupleSubscription,
  getPlannerSubscription,
} from "@/lib/billing/get-subscription";
import { BILLING_PLANS } from "@/lib/billing/plans";
import {
  resolveBusinessAccountId,
  resolvePersonalAccountId,
} from "@/lib/billing/resolve-account";
import { reconcileCheckoutReturn } from "@/lib/billing/sync-subscription";
import type { AccountKind } from "@/lib/account-context";
import { getAccountContext } from "@/lib/account-context";
import { shellLayoutClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function formatRenewalDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const FREE_COPY: Record<AccountKind, string> = {
  personal:
    "Start your 7-day free trial to unlock the full couple experience.",
  business:
    "You're on the free plan. Subscribe to unlock the full planner workspace.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string }>;
}) {
  const { status, session_id } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  const isPlanner = account.kind === "business";
  const accountId = isPlanner
    ? await resolveBusinessAccountId(supabase)
    : await resolvePersonalAccountId(supabase);
  await reconcileCheckoutReturn(accountId, { status, session_id });
  const subscription = isPlanner
    ? await getPlannerSubscription(supabase)
    : await getCoupleSubscription(supabase);
  const isVenuePlan = isPlanner && subscription.accountPlan === "venue";
  const planLabel = isVenuePlan
    ? BILLING_PLANS.venue.label
    : isPlanner
      ? BILLING_PLANS.planner.label
      : BILLING_PLANS.couple.label;
  const renewalDate = formatRenewalDate(subscription.currentPeriodEnd);
  const shellClass = shellLayoutClass(account.kind, false, "reading");

  const isPaidActive = subscription.isActive && subscription.status === "active";
  const isTrialing =
    subscription.status === "trialing" && subscription.isActive;
  // Real Stripe Subscription → Customer Portal (not local trial / lifetime).
  const showManage =
    subscription.hasSubscription &&
    subscription.status !== null &&
    !["canceled", "incomplete_expired"].includes(subscription.status);
  // Convert from trial / reactivate when not on a paid active plan.
  // Demo stays out of Stripe CTAs. Suppressed when Portal manage applies.
  const showSubscribe =
    !showManage &&
    subscription.status !== "active" &&
    subscription.status !== "demo";

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description={
          isPlanner
            ? "Manage your planner subscription."
            : "Manage your couple plan."
        }
      />

      {status === "success" && !isPaidActive ? (
        <Card className="mt-6 border-hairline bg-surface px-4 py-3">
          <p className="text-[14px] text-muted">
            Thanks — we&apos;re finalizing your{" "}
            {isPlanner ? "subscription" : "plan"}. This usually takes a few
            seconds. Refresh if your plan status hasn&apos;t updated yet.
          </p>
        </Card>
      ) : null}

      {status === "cancelled" ? (
        <Card className="mt-6 border-hairline bg-surface px-4 py-3">
          <p className="text-[14px] text-muted">Checkout was cancelled.</p>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-medium text-ink">
              {planLabel} plan
            </h2>
            {isPaidActive ? (
              <div className="mt-2 space-y-1">
                <Pill variant="sage">Active</Pill>
                {subscription.hasSubscription ? (
                  <>
                    {renewalDate ? (
                      <p className="text-[13px] text-muted">
                        Renews {renewalDate}
                      </p>
                    ) : null}
                    {subscription.cancelAtPeriodEnd && renewalDate ? (
                      <p className="text-[13px] text-clay">
                        Cancels at end of period ({renewalDate})
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[13px] text-muted">
                    Full plan — you&apos;re all set. No further charges for this
                    account.
                  </p>
                )}
              </div>
            ) : isTrialing ? (
              <div className="mt-2 space-y-1">
                <Pill variant="clay">Trial</Pill>
                {isPlanner ? (
                  <>
                    {renewalDate ? (
                      <p className="text-[13px] text-muted">
                        Trial ends {renewalDate}
                      </p>
                    ) : null}
                    <p className="text-[13px] text-muted">
                      Subscribe anytime — Monthly or Annual. No second free
                      period stacks on checkout.
                    </p>
                  </>
                ) : (
                  <>
                    {renewalDate ? (
                      <p className="text-[13px] text-muted">
                        Trial ends {renewalDate}. Choose Monthly or Lifetime
                        anytime — no card required until you do.
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted">
                        Choose Monthly or Lifetime anytime — no card required
                        until you do.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : subscription.isActive && subscription.status === "demo" ? (
              <div className="mt-2 space-y-1">
                <Pill variant="sage">Demo</Pill>
                <p className="text-[13px] text-muted">
                  Demo accounts are fully unlocked for exploration.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-muted">
                {FREE_COPY[account.kind]}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {showManage ? (
              <ManageBillingButton />
            ) : showSubscribe ? (
              isPlanner ? (
                <PlannerSubscribeButton />
              ) : (
                <CoupleSubscribeButton />
              )
            ) : null}
          </div>
        </div>
      </Card>

      {/* VENUE-03a: discoverable path for planner → venue (not marketing). */}
      {isPlanner && !isVenuePlan ? (
        <Card className="mt-4 p-5">
          <p className="text-[14px] text-muted">
            Running a venue with multiple planners?{" "}
            <Link
              href="/account/venue-upgrade"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Learn about the venue plan
            </Link>
            .
          </p>
        </Card>
      ) : null}
    </div>
  );
}
