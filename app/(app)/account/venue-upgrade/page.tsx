import { redirect } from "next/navigation";
import { VenueSubscribeButton } from "@/components/billing/couple-billing-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { shellLayoutClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

/**
 * VENUE-02 / VENUE-02b: venue upgrade — Monthly/Annual Checkout.
 * Linked from /account/billing (VENUE-03a); not on public /pricing yet.
 */
export default async function VenueUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account || account.kind !== "business") {
    redirect("/account/billing");
  }

  const accountId = await resolveBusinessAccountId(supabase);

  const { data: row } = await supabase
    .from("accounts")
    .select("plan")
    .eq("id", accountId)
    .maybeSingle();

  const isVenue = row?.plan === "venue";
  const shellClass = shellLayoutClass(account.kind, false, "reading");
  const venuePlan = BILLING_PLANS.venue;

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Venue plan"
        description="Subscribe to the venue plan. Branding assets are configured separately."
      />

      {status === "success" && !isVenue ? (
        <Card className="mt-6 border-hairline bg-surface px-4 py-3">
          <p className="text-[14px] text-muted">
            Thanks — we&apos;re finalizing your venue subscription. This usually
            takes a few seconds. Refresh if your plan hasn&apos;t updated yet.
          </p>
        </Card>
      ) : null}

      {status === "cancelled" ? (
        <Card className="mt-6 border-hairline bg-surface px-4 py-3">
          <p className="text-[14px] text-muted">Checkout was cancelled.</p>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          {venuePlan.label}
        </p>
        <h2 className="mt-2 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {venuePlan.monthly.amountLabel} or {venuePlan.annual.amountLabel}
        </h2>
        <p className="mt-2 text-[14px] text-muted">
          Billed through Stripe. Your own dashboard branding unlocks when
          white-label is enabled for this account.
        </p>

        {isVenue ? (
          <p className="mt-6 text-[15px] font-medium text-sage">
            This account is already on the venue plan.
          </p>
        ) : (
          <div className="mt-6">
            <VenueSubscribeButton accountId={accountId} />
          </div>
        )}
      </Card>
    </div>
  );
}
