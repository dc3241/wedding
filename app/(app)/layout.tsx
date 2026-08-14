import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountDensityProvider } from "@/components/account-density-provider";
import { CoupleShell } from "@/components/couple/couple-shell";
import { DemoBanner } from "@/components/demo/demo-banner";
import { PlannerShell } from "@/components/planner/planner-shell";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { VendorSearchCacheProvider } from "@/components/vendors/VendorSearchCacheProvider";
import { getAccountContext } from "@/lib/account-context";
import {
  getBrandingForProject,
  getOwnAccountBranding,
  projectIdFromPathname,
} from "@/lib/branding/get-branding";
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
  let plannerBranding = null;
  if (isPlanner) {
    const [{ data: projects }, ownBranding] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, wedding_date")
        .is("archived_at", null)
        .order("wedding_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      getOwnAccountBranding(),
    ]);
    plannerProjects = projects ?? [];
    plannerBranding = ownBranding;
  }

  let coupleBranding = null;
  if (!isPlanner) {
    const headersList = await headers();
    const projectId = projectIdFromPathname(
      headersList.get("x-pathname") ?? "",
    );
    if (projectId) {
      coupleBranding = await getBrandingForProject(projectId);
    }
  }

  return (
    <AccountDensityProvider kind={accountKind}>
      <VendorSearchCacheProvider>
        {showDemoBanner ? <DemoBanner /> : null}
        {isPlanner ? (
          <PlannerShell projects={plannerProjects} branding={plannerBranding}>
            {children}
          </PlannerShell>
        ) : (
          <CoupleShell branding={coupleBranding}>{children}</CoupleShell>
        )}
      </VendorSearchCacheProvider>
    </AccountDensityProvider>
  );
}
