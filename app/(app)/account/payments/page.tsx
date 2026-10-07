import { redirect } from "next/navigation";
import {
  openExpressDashboard,
  refreshPaymentsStatus,
  startPaymentsSetup,
} from "@/app/(app)/account/payments/actions";
import { ConnectEmbeddedPanel } from "@/app/(app)/account/payments/ConnectEmbeddedPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { getAccountContext } from "@/lib/account-context";
import { refreshConnectedAccount } from "@/lib/connect/accounts";
import type { CapabilityStatus } from "@/lib/connect/accounts";
import { shellLayoutClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function statusLabel(status: CapabilityStatus) {
  if (status === "active") return "Ready";
  if (status === "restricted") return "Needs attention";
  if (status === "unsupported") return "Unavailable";
  return "In progress";
}

function statusVariant(status: CapabilityStatus) {
  if (status === "active") return "sage" as const;
  if (status === "restricted" || status === "unsupported") return "rosewood" as const;
  return "clay" as const;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account || account.kind !== "business") {
    redirect("/account/billing");
  }

  const shellClass = shellLayoutClass(account.kind, false, "reading");
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  let connected = null;
  let loadError: string | null = null;
  if (!account.isDemo) {
    try {
      connected = await refreshConnectedAccount(account.accountId);
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Couldn't load payments.";
    }
  }

  return (
    <div className={`${shellClass} space-y-6`}>
      <PageHeader
        eyebrow="Account"
        title="Payments"
        description="Accept card payments on proposals. The couple pays you directly. Your First Look subscription stays on its own billing page."
      />

      {error ? (
        <p className="text-[14px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      {loadError ? (
        <p className="text-[14px] text-rosewood" role="alert">
          {loadError}
        </p>
      ) : null}

      {account.isDemo ? (
        <Card className="p-6">
          <p className="text-[15px] font-medium text-ink">
            Payments aren&apos;t available on the demo workspace.
          </p>
        </Card>
      ) : null}

      {!account.isDemo && !connected ? (
        <Card className="space-y-4 p-6">
          <p className="text-[15px] font-medium text-ink">
            Set up a payout account to turn on Pay on your proposals. Stripe
            verifies the business inside this page. US businesses only for now.
          </p>
          <form action={startPaymentsSetup}>
            <Button type="submit">Set up payments</Button>
          </form>
        </Card>
      ) : null}

      {!account.isDemo && connected ? (
        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            <Pill variant={statusVariant(connected.cardPaymentsStatus)}>
              {`Cards ${statusLabel(connected.cardPaymentsStatus).toLowerCase()}`}
            </Pill>
            <Pill variant={statusVariant(connected.payoutsStatus)}>
              {`Payouts ${statusLabel(connected.payoutsStatus).toLowerCase()}`}
            </Pill>
          </div>
          <p className="text-[14px] text-muted">
            Pay appears on a proposal once cards are ready. Signing a proposal
            still works before that.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={refreshPaymentsStatus}>
              <Button type="submit" variant="ghost">
                Refresh status
              </Button>
            </form>
            <form action={openExpressDashboard}>
              <Button type="submit" variant="ghost">
                Open Express Dashboard
              </Button>
            </form>
          </div>
          {publishableKey ? (
            <ConnectEmbeddedPanel publishableKey={publishableKey} />
          ) : (
            <p className="text-[14px] text-rosewood" role="alert">
              Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to show onboarding here.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
