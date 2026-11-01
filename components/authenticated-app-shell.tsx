import { headers } from "next/headers";
import { AccountDensityProvider } from "@/components/account-density-provider";
import {
  CoupleShell,
  type CoupleRailProject,
} from "@/components/couple/couple-shell";
import { DemoBanner } from "@/components/demo/demo-banner";
import { PlannerShell } from "@/components/planner/planner-shell";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { VendorSearchCacheProvider } from "@/components/vendors/VendorSearchCacheProvider";
import { getAccountContext } from "@/lib/account-context";
import { parseHiddenTools } from "@/lib/event-type";
import {
  getBrandingForProject,
  getOwnAccountBranding,
  projectIdFromPathname,
} from "@/lib/branding/get-branding";
import { createClient } from "@/utils/supabase/server";
import type { ReactNode } from "react";

/** App chrome for an already-authenticated session. Does not redirect. */
export async function AuthenticatedAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
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
  let coupleProjects: CoupleRailProject[] = [];
  if (!isPlanner) {
    const headersList = await headers();
    const projectId = projectIdFromPathname(
      headersList.get("x-pathname") ?? "",
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Sidebar data: every wedding this viewer can open (RLS-scoped — a couple
    // sees their one project, an invited member sees the ones they're on),
    // plus their project_members role for the CAL-04/06 + Customize rules.
    const [brandingResult, projectsResult, rolesResult] = await Promise.all([
      projectId ? getBrandingForProject(projectId) : Promise.resolve(null),
      supabase
        .from("projects")
        .select("id, name, wedding_date, hidden_tools")
        .is("archived_at", null)
        .order("wedding_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      user
        ? supabase
            .from("project_members")
            .select("project_id, role")
            .eq("user_id", user.id)
        : Promise.resolve({
            data: [] as { project_id: string; role: string }[] | null,
          }),
    ]);
    coupleBranding = brandingResult;
    const roleByProject = new Map(
      (rolesResult.data ?? []).map((row) => [row.project_id, row.role]),
    );
    coupleProjects = (projectsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? "",
      weddingDate: row.wedding_date,
      hiddenTools: parseHiddenTools(row.hidden_tools),
      // Account owners never read role for tab gating (see project layout).
      memberRole: account ? null : (roleByProject.get(row.id) ?? null),
    }));
  }

  return (
    <AccountDensityProvider kind={accountKind}>
      <VendorSearchCacheProvider>
        {showDemoBanner ? <DemoBanner /> : null}
        {isPlanner ? (
          <PlannerShell
            projects={plannerProjects}
            branding={plannerBranding}
            plan={account?.plan ?? "planner"}
            homeHref={showDemoBanner ? "/demo" : "/dashboard"}
          >
            {children}
          </PlannerShell>
        ) : (
          <CoupleShell
            branding={coupleBranding}
            accountKind={account?.kind ?? null}
            projects={coupleProjects}
            homeProjectId={account?.firstProjectId ?? null}
          >
            {children}
          </CoupleShell>
        )}
      </VendorSearchCacheProvider>
    </AccountDensityProvider>
  );
}
