import { redirect } from "next/navigation";
import {
  CoupleSubscribeButton,
  ManageBillingButton,
  PlannerSubscribeButton,
} from "@/components/billing/couple-billing-actions";
import { ButtonLink } from "@/components/ui/button";
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
import {
  getAccountAssistantAccess,
  toAccessSummary,
} from "@/lib/billing/assistant-access";
import type { AssistantAccessSummary } from "@/lib/billing/assistant-budget";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

function formatRenewalDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function resolveVenueCadence(priceId: string | null) {
  const venue = BILLING_PLANS.venue;
  if (priceId && priceId === venue.monthly.priceId) return venue.monthly;
  if (priceId && priceId === venue.annual.priceId) return venue.annual;
  return null;
}

const FREE_COPY: Record<AccountKind, string> = {
  // COUPLES-PIVOT part 3: planning is free; only the assistant is paid.
  personal:
    "Every planning tool is free. Add the assistant to have it update your checklist, budget, and guests for you. Your first message starts a free 7-day trial.",
  business:
    "The workspace is locked until you subscribe.",
};

const COUPLE_LAPSED_COPY =
  "Your assistant trial has ended. Everything else stays free — upgrade any time to turn the assistant back on.";

function AssistantAllowance({ summary }: { summary: AssistantAccessSummary }) {
  if (summary.usedPercent === null) return null;
  const resets = formatRenewalDate(summary.resetsAt);
  const label =
    summary.plan === "trial"
      ? "Trial allowance"
      : resets
        ? "This month's assistant allowance"
        : "Assistant allowance";
  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="text-[13px] tabular-nums text-muted">
          {summary.usedPercent}% used
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
        role="progressbar"
        aria-valuenow={summary.usedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${summary.usedPercent}% used`}
      >
        <div
          className={
            summary.usedPercent >= 90
              ? "h-full rounded-[var(--radius-pill)] bg-rosewood"
              : summary.usedPercent >= 75
                ? "h-full rounded-[var(--radius-pill)] bg-clay"
                : "h-full rounded-[var(--radius-pill)] bg-sage"
          }
          style={{ width: `${summary.usedPercent}%` }}
        />
      </div>
      {resets ? (
        <p className="mt-1.5 text-[12px] text-muted">Resets {resets}</p>
      ) : null}
    </div>
  );
}

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
      : "Assistant";
  let assistantSummary: AssistantAccessSummary | null = null;
  if (!isPlanner) {
    try {
      assistantSummary = toAccessSummary(
        await getAccountAssistantAccess(createServiceRoleClient(), accountId),
        true,
      );
    } catch (error) {
      console.error("[billing] assistant allowance", error);
    }
  }
  const venueCadence = isVenuePlan
    ? resolveVenueCadence(subscription.priceId)
    : null;
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
            : "Planning is free. The assistant is the one paid upgrade."
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

      <div
        className={
          isPlanner
            ? "mt-6 grid items-stretch gap-4 md:grid-cols-2"
            : "mt-6"
        }
      >
        <Card className="p-6">
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
                      {isPlanner
                        ? "Full plan — you're all set. No further charges for this account."
                        : "Lifetime assistant — you're all set. No further charges."}
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
                          Assistant trial ends {renewalDate}. Choose Monthly or
                          Lifetime anytime to keep it — no card required until
                          you do.
                        </p>
                      ) : (
                        <p className="text-[13px] text-muted">
                          Choose Monthly or Lifetime anytime to keep the
                          assistant — no card required until you do.
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
                <p className="mt-2 max-w-[46ch] text-[13px] text-muted">
                  {!isPlanner && subscription.status !== null
                    ? COUPLE_LAPSED_COPY
                    : FREE_COPY[account.kind]}
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
          {assistantSummary ? (
            <AssistantAllowance summary={assistantSummary} />
          ) : null}
        </Card>

        {/* VENUE-08: venue subscribers see plan + cadence pricing (not the upgrade CTA). */}
        {isVenuePlan ? (
          <Card className="flex flex-col p-6">
            <h2 className="text-[15px] font-medium text-ink">
              Current plan: {BILLING_PLANS.venue.label}
            </h2>
            <p className="mt-2 text-[13px] text-muted">
              {venueCadence
                ? `${venueCadence.label} ${venueCadence.amountLabel}`
                : `${BILLING_PLANS.venue.monthly.amountLabel} or ${BILLING_PLANS.venue.annual.amountLabel}`}
            </p>
          </Card>
        ) : null}

        {/* VENUE-06: planner → venue at equal weight with the current plan card. */}
        {isPlanner && !isVenuePlan ? (
          <Card className="flex flex-col p-6">
            <h2 className="text-[15px] font-medium text-ink">
              Upgrade to Venue
            </h2>
            <p className="mt-2 text-[13px] text-muted">
              Running a venue with multiple planners?{" "}
              {BILLING_PLANS.venue.monthly.amountLabel} or{" "}
              {BILLING_PLANS.venue.annual.amountLabel}. Own-shell branding
              unlocks when white-label is enabled.
            </p>
            <div className="mt-auto pt-4">
              <ButtonLink href="/account/venue-upgrade">
                Upgrade to Venue
              </ButtonLink>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
