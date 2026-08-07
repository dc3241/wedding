import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/dashboard/account-dashboard";
import {
  buildUrgentItems,
  buildWeddingCardModels,
  countTasksDueThisWeek,
  countVendorsNeedingAction,
  type TaskRow,
  type VendorRow,
} from "@/lib/dashboard-aggregates";
import { getAccountContext } from "@/lib/account-context";
import { createClient } from "@/utils/supabase/server";

const projectSelect = "id, name, wedding_date, status" as const;

type GuestConfirmedRow = { project_id: string };
type TaskRollupRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project_id: string;
  projects: { name: string } | { name: string }[] | null;
};

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

  const emptyTasks: TaskRollupRow[] = [];
  const emptyVendors: VendorRow[] = [];
  const emptyGuests: GuestConfirmedRow[] = [];

  const [{ data: tasks }, { data: vendorRows }, { data: confirmedGuests }] =
    activeProjectIds.length === 0
      ? [
          { data: emptyTasks },
          { data: emptyVendors },
          { data: emptyGuests },
        ]
      : await Promise.all([
          // Full active-scoped task set — rollup + urgent both derive from this.
          supabase
            .from("tasks")
            .select("id, title, status, due_date, project_id, projects(name)")
            .in("project_id", activeProjectIds),
          supabase
            .from("project_vendors")
            .select("id, status, project_id, vendors(name), projects(name)")
            .in("project_id", activeProjectIds),
          supabase
            .from("guests")
            .select("project_id")
            .in("project_id", activeProjectIds)
            .eq("rsvp_status", "attending"),
        ]);

  const taskList = (tasks ?? []) as TaskRollupRow[];
  const vendors = (vendorRows ?? []) as VendorRow[];
  const confirmedGuestRows = (confirmedGuests ?? []) as GuestConfirmedRow[];

  // Urgent / due-this-week still only care about incomplete dated tasks.
  const urgentTaskList: TaskRow[] = taskList.filter(
    (task) => task.status !== "done" && task.due_date != null,
  );

  const activeWeddingCards = buildWeddingCardModels(
    activeList,
    taskList,
    confirmedGuestRows,
  );

  return (
    <AccountDashboard
      activeProjects={activeList}
      archivedProjects={archivedList}
      activeWeddingCards={activeWeddingCards}
      activeWeddings={activeList.length}
      tasksDueThisWeek={countTasksDueThisWeek(urgentTaskList)}
      vendorsNeedingAction={countVendorsNeedingAction(vendors)}
      urgentItems={buildUrgentItems(urgentTaskList, vendors)}
    />
  );
}
