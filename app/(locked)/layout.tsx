import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AccountDensityProvider } from "@/components/account-density-provider";
import { DemoBanner } from "@/components/demo/demo-banner";
import { getAccountContext } from "@/lib/account-context";
import { noIndexRobots } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  ...noIndexRobots,
};

/**
 * ENT-01 lock screen lives outside `(app)` so the planner/couple shell
 * is a different layout segment. `(app)/layout` is cached across
 * navigations and must not branch on pathname — doing so leaves the
 * chrome-less lock tree mounted after trial start / billing links.
 */
export default async function LockedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";
  const showDemoBanner = account?.isDemo === true;

  return (
    <AccountDensityProvider kind={accountKind}>
      {showDemoBanner ? <DemoBanner /> : null}
      {children}
    </AccountDensityProvider>
  );
}
