import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountDensityProvider } from "@/components/account-density-provider";
import { CoupleShell } from "@/components/couple/couple-shell";
import { DemoBanner } from "@/components/demo/demo-banner";
import { PlannerShell } from "@/components/planner/planner-shell";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { VendorSearchCacheProvider } from "@/components/vendors/VendorSearchCacheProvider";
import { getAccountContext } from "@/lib/account-context";
import { ACCOUNT_LOCKED_PATH } from "@/lib/billing/entitlement-gate";
import {
  getBrandingForProject,
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

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isLockedPage = pathname === ACCOUNT_LOCKED_PATH;

  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";
  const isPlanner = accountKind === "business";
  const showDemoBanner = account?.isDemo === true;

  // ENT-01: lock screen is Tier 2 full-bleed — no couple/planner chrome.
  if (isLockedPage) {
    return (
      <AccountDensityProvider kind={accountKind}>
        {showDemoBanner ? <DemoBanner /> : null}
        {children}
      </AccountDensityProvider>
    );
  }

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

  let coupleBranding = null;
  if (!isPlanner) {
    const projectId = projectIdFromPathname(pathname);
    if (projectId) {
      coupleBranding = await getBrandingForProject(projectId);
    }
  }

  return (
    <AccountDensityProvider kind={accountKind}>
      <VendorSearchCacheProvider>
        {showDemoBanner ? <DemoBanner /> : null}
        {isPlanner ? (
          <PlannerShell projects={plannerProjects}>{children}</PlannerShell>
        ) : (
          <CoupleShell branding={coupleBranding}>{children}</CoupleShell>
        )}
      </VendorSearchCacheProvider>
    </AccountDensityProvider>
  );
}
