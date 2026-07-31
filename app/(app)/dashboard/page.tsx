import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/dashboard/account-dashboard";
import {
  buildUrgentItems,
  countTasksDueThisWeek,
  countVendorsNeedingAction,
  type TaskRow,
  type VendorRow,
} from "@/lib/dashboard-aggregates";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

const projectSelect = "id, name, wedding_date, status" as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account) {
    redirect("/projects");
  }

  if (account.kind === "personal") {
    if (account.singleProjectId) {
      redirect(`/projects/${account.singleProjectId}`);
    }
    redirect("/projects");
  }

  const [{ data: activeProjects }, { data: archivedProjects }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(projectSelect)
        .is("archived_at", null)
        .order("wedding_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("projects")
        .select(projectSelect)
        .not("archived_at", "is", null)
        .order("wedding_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
    ]);

  const activeList = activeProjects ?? [];
  const archivedList = archivedProjects ?? [];
  const activeProjectIds = activeList.map((project) => project.id);

  const [{ data: tasks }, { data: vendorRows }] =
    activeProjectIds.length === 0
      ? [{ data: [] as TaskRow[] }, { data: [] as VendorRow[] }]
      : await Promise.all([
          supabase
            .from("tasks")
            .select("id, title, status, due_date, project_id, projects(name)")
            .in("project_id", activeProjectIds)
            .neq("status", "done")
            .not("due_date", "is", null),
          supabase
            .from("project_vendors")
            .select("id, status, project_id, vendors(name), projects(name)")
            .in("project_id", activeProjectIds),
        ]);

  const taskList = (tasks ?? []) as TaskRow[];
  const vendors = (vendorRows ?? []) as VendorRow[];

  return (
    <AccountDashboard
      activeProjects={activeList}
      archivedProjects={archivedList}
      activeWeddings={activeList.length}
      tasksDueThisWeek={countTasksDueThisWeek(taskList)}
      vendorsNeedingAction={countVendorsNeedingAction(vendors)}
      urgentItems={buildUrgentItems(taskList, vendors)}
    />
  );
}
