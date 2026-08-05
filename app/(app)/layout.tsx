import { redirect } from "next/navigation";
import { AccountDensityProvider } from "@/components/account-density-provider";
import { CoupleShell } from "@/components/couple/couple-shell";
import { PlannerShell } from "@/components/planner/planner-shell";
import { VendorSearchCacheProvider } from "@/components/vendors/VendorSearchCacheProvider";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

export default async function AppLayout({
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
  const isPlanner = accountKind === "business";

  if (isPlanner) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, wedding_date")
      .is("archived_at", null)
      .order("wedding_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    return (
      <AccountDensityProvider kind={accountKind}>
        <VendorSearchCacheProvider>
          <PlannerShell projects={projects ?? []}>{children}</PlannerShell>
        </VendorSearchCacheProvider>
      </AccountDensityProvider>
    );
  }

  return (
    <AccountDensityProvider kind={accountKind}>
      <VendorSearchCacheProvider>
        <CoupleShell>{children}</CoupleShell>
      </VendorSearchCacheProvider>
    </AccountDensityProvider>
  );
}
