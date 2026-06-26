import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/dashboard/account-dashboard";
import {
  buildUrgentItems,
  countActiveWeddings,
  countTasksDueThisWeek,
  countVendorsNeedingAction,
  type TaskRow,
  type VendorRow,
} from "@/lib/dashboard-aggregates";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

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

  const [
    { data: projects },
    { data: tasks },
    { data: vendorRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, wedding_date, status")
      .order("wedding_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, project_id, projects(name)")
      .neq("status", "done")
      .not("due_date", "is", null),
    supabase
      .from("project_vendors")
      .select("id, status, project_id, vendors(name), projects(name)"),
  ]);

  const projectList = projects ?? [];
  const taskList = (tasks ?? []) as TaskRow[];
  const vendors = (vendorRows ?? []) as VendorRow[];

  return (
    <AccountDashboard
      projects={projectList}
      activeWeddings={countActiveWeddings(projectList)}
      tasksDueThisWeek={countTasksDueThisWeek(taskList)}
      vendorsNeedingAction={countVendorsNeedingAction(vendors)}
      urgentItems={buildUrgentItems(taskList, vendors)}
    />
  );
}
