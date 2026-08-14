import { redirect } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { checkEntitlement } from "@/lib/billing/entitlement-gate";
import { getSubscriptionForAccount } from "@/lib/billing/get-subscription";
import { startCoupleTrial } from "@/lib/billing/start-couple-trial";
import { startPlannerTrial } from "@/lib/billing/start-planner-trial";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account locked",
  description: "Your First Look account needs an active plan to continue.",
};

export default async function AccountLockedPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  const { entitled } = await checkEntitlement(supabase, account.accountId);
  if (entitled) {
    redirect(await getPostLoginPath(supabase));
  }

  const subscription = await getSubscriptionForAccount(
    supabase,
    account.accountId,
  );
  // Copy-only: no row / null status → never started; any inactive status → lapsed.
  const neverStarted = subscription.status === null;
  const isPlanner = account.kind === "business";
  const showTrialCta = neverStarted;
  const startTrialAction = isPlanner ? startPlannerTrial : startCoupleTrial;

  const title = neverStarted
    ? "Start your trial to continue"
    : "Reactivate your plan to continue";
  const body = neverStarted
    ? isPlanner
      ? "Your planner workspace is ready — start a trial to unlock the dashboard, clients, and tools."
      : "Your wedding workspace is ready — start a trial to unlock planning, guests, and the rest."
    : isPlanner
      ? "This planner account is locked. Reactivate your plan to get back to your clients and workspace."
      : "This account is locked. Reactivate your plan to get back to your wedding workspace.";
  const cta = neverStarted ? "Start your trial" : "Reactivate plan";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-canvas px-4 py-16">
      {/* Tier 2: exactly one --deep field on this surface */}
      <div className="w-full max-w-lg rounded-[28px] bg-[var(--deep)] p-6 shadow-[0_18px_44px_-14px_rgba(61,36,48,0.45)] md:p-8">
        <Card
          variant="emotional"
          className="px-6 py-8 text-center md:px-8 md:py-10"
        >
          <Eyebrow>Account locked</Eyebrow>
          <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[36px]">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] font-medium leading-relaxed text-muted">
            {body}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:items-center">
            {showTrialCta ? (
              <form action={startTrialAction} className="w-full sm:w-auto">
                <Button type="submit" variant="primary" className="w-full">
                  Start your 7-day free trial
                </Button>
              </form>
            ) : (
              <ButtonLink
                href="/account/billing"
                variant="primary"
                className="w-full sm:w-auto"
              >
                {cta}
              </ButtonLink>
            )}
            <ButtonLink
              href="/account/billing"
              variant="ghost"
              className="w-full sm:w-auto"
            >
              Billing details
            </ButtonLink>
          </div>
          <p className="mt-6 text-[13px] text-muted">
            Your data stays put — nothing is deleted while the account is locked.
          </p>
        </Card>
      </div>
    </div>
  );
}
