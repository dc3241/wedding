import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/topbar";
import { getAccountContext } from "@/lib/account-context";
import { getPostLoginPath } from "@/lib/post-login-path";
import { listClaimedVendorShares } from "@/lib/vendors/claimed-shares";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { noIndexRobots } from "@/lib/seo";
import { displayCoupleNames, formatEyebrowDate } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Your weddings",
  description: "Weddings you have saved as a vendor.",
  ...noIndexRobots,
};

export const dynamic = "force-dynamic";

function VendorHomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
        <form action={logout}>
          <Button type="submit" variant="default" className="px-3 py-1.5 text-[13px]">
            Log out
          </Button>
        </form>
      </header>
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 py-12 md:px-8">
        {children}
      </div>
    </div>
  );
}

export default async function VendorHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const account = await getAccountContext(supabase);
  if (account) {
    redirect(await getPostLoginPath(supabase));
  }

  const shares = await listClaimedVendorShares();

  return (
    <VendorHomeShell>
      <div className="space-y-6">
        <div>
          <Eyebrow className="mb-3 block">Vendor</Eyebrow>
          <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[42px]">
            Your weddings
          </h1>
          <p className="mt-3 text-[15px] font-medium text-muted">
            Saved share pages — not a live workspace. Open a wedding to see
            details and messages.
          </p>
        </div>

        {shares.length === 0 ? (
          <Card className="p-8">
            <p className="text-[15px] font-medium text-muted">
              No saved weddings yet. Open a share link and choose Save this
              wedding.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {shares.map((share) => {
              const coupleNames = displayCoupleNames(share.weddingName);
              const dateLabel = share.weddingDate
                ? formatEyebrowDate(share.weddingDate)
                : "Date to be set";
              const category = share.vendorCategory
                ? vendorCategoryLabel(share.vendorCategory)
                : "Vendor";
              return (
                <li key={share.projectVendorId}>
                  <Link
                    href={share.href}
                    className="block rounded-[var(--radius-card)] bg-surface px-6 py-5 no-underline shadow-raised transition-opacity hover:opacity-90"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                          {category}
                        </p>
                        <p className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                          {coupleNames}
                        </p>
                        <p className="mt-1 text-[13px] text-muted">{dateLabel}</p>
                        <p className="mt-1 text-[13px] text-muted">
                          Shared with {share.vendorName}
                        </p>
                      </div>
                      {share.unreadCount > 0 ? (
                        <Pill variant="clay">
                          {share.unreadCount === 1
                            ? "1 new message"
                            : `${share.unreadCount} new messages`}
                        </Pill>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </VendorHomeShell>
  );
}
