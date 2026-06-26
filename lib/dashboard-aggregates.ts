import {
  countTasksDueThisWeek,
} from "@/components/dashboard/planner-dashboard";

export type PlannerProjectSummary = {
  id: string;
  name: string;
  wedding_date: string | null;
  status: string;
};

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project_id: string;
  projects: { name: string } | { name: string }[] | null;
};

export type VendorRow = {
  id: string;
  status: string;
  project_id: string;
  vendors: { name: string } | { name: string }[] | null;
  projects: { name: string } | { name: string }[] | null;
};

export type UrgentItem =
  | {
      kind: "task";
      id: string;
      projectId: string;
      projectName: string;
      title: string;
      dueDate: string;
      overdue: boolean;
    }
  | {
      kind: "vendor";
      id: string;
      projectId: string;
      projectName: string;
      vendorName: string;
      status: string;
    };

function projectNameFromJoin(
  projects: TaskRow["projects"],
): string {
  if (!projects) return "Wedding";
  return Array.isArray(projects) ? projects[0]?.name ?? "Wedding" : projects.name;
}

function vendorNameFromJoin(
  vendors: VendorRow["vendors"],
): string {
  if (!vendors) return "Vendor";
  return Array.isArray(vendors) ? vendors[0]?.name ?? "Vendor" : vendors.name;
}

export function buildUrgentItems(
  tasks: TaskRow[],
  vendors: VendorRow[],
): UrgentItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soonEnd = new Date(today);
  soonEnd.setDate(soonEnd.getDate() + 7);

  const urgentTasks: Extract<UrgentItem, { kind: "task" }>[] = [];

  for (const task of tasks) {
    if (task.status === "done" || !task.due_date) continue;

    const due = new Date(task.due_date + "T00:00:00");
    due.setHours(0, 0, 0, 0);

    const overdue = due < today;
    const soonDue = due >= today && due <= soonEnd;
    if (!overdue && !soonDue) continue;

    urgentTasks.push({
      kind: "task",
      id: task.id,
      projectId: task.project_id,
      projectName: projectNameFromJoin(task.projects),
      title: task.title,
      dueDate: task.due_date,
      overdue,
    });
  }

  urgentTasks.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const urgentVendors: Extract<UrgentItem, { kind: "vendor" }>[] = vendors
    .filter((row) => row.status === "to_contact" || row.status === "contacted")
    .map((row) => ({
      kind: "vendor" as const,
      id: row.id,
      projectId: row.project_id,
      projectName: projectNameFromJoin(row.projects),
      vendorName: vendorNameFromJoin(row.vendors),
      status: row.status,
    }));

  return [...urgentTasks, ...urgentVendors];
}

export function countVendorsNeedingAction(vendors: VendorRow[]): number {
  return vendors.filter(
    (row) => row.status === "to_contact" || row.status === "contacted",
  ).length;
}

export function countActiveWeddings(projects: PlannerProjectSummary[]): number {
  return projects.filter((project) => project.status === "active").length;
}

export { countTasksDueThisWeek };
