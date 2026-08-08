import { redirect } from "next/navigation";
import { AccountDensityProvider } from "@/components/account-density-provider";
import { CoupleShell } from "@/components/couple/couple-shell";
import { DemoBanner } from "@/components/demo/demo-banner";
import { PlannerShell } from "@/components/planner/planner-shell";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
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
  const showDemoBanner = account?.isDemo === true;

  let plannerProjects: SidebarProject[] = [];
  if (isPlanner) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, wedding_date")
      .is("archived_at", null)
      .order("wedding_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    plannerProjects = projects ?? [];
  }

  return (
    <AccountDensityProvider kind={accountKind}>
      <VendorSearchCacheProvider>
        {showDemoBanner ? <DemoBanner /> : null}
        {isPlanner ? (
          <PlannerShell projects={plannerProjects}>{children}</PlannerShell>
        ) : (
          <CoupleShell>{children}</CoupleShell>
        )}
      </VendorSearchCacheProvider>
    </AccountDensityProvider>
  );
}
