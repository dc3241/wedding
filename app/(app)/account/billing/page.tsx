import { redirect } from "next/navigation";
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
    "You're on the free plan. Subscribe to unlock the full couple experience.",
  business:
    "You're on the free plan. Subscribe to unlock the full planner workspace.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  const isPlanner = account.kind === "business";
  const subscription = isPlanner
    ? await getPlannerSubscription(supabase)
    : await getCoupleSubscription(supabase);
  const plan = isPlanner ? BILLING_PLANS.planner : BILLING_PLANS.couple;
  const renewalDate = formatRenewalDate(subscription.currentPeriodEnd);
  const shellClass = shellLayoutClass(account.kind, false, "reading");

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description={
          isPlanner
            ? "Manage your planner subscription."
            : "Manage your couple subscription."
        }
      />

      {status === "success" && !subscription.isActive ? (
        <Card className="mt-6 border-hairline bg-surface px-4 py-3">
          <p className="text-[14px] text-muted">
            Thanks — we&apos;re finalizing your subscription. This usually takes
            a few seconds. Refresh if your plan status hasn&apos;t updated yet.
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
              {plan.label} plan
            </h2>
            {subscription.isActive ? (
              <div className="mt-2 space-y-1">
                <Pill variant="sage">Active</Pill>
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
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-muted">
                {FREE_COPY[account.kind]}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {subscription.isActive ? (
              <ManageBillingButton />
            ) : isPlanner ? (
              <PlannerSubscribeButton />
            ) : (
              <CoupleSubscribeButton />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
