import {
  countTasksDueThisWeek,
} from "@/components/dashboard/planner-dashboard";
import { isTaskPastDue } from "@/lib/task-overdue";

export type PlannerProjectSummary = {
  id: string;
  name: string;
  wedding_date: string | null;
  status: string;
};

/** Active-project card view-model for the planner dashboard wedding grid (DASH-03). */
export type WeddingCardModel = {
  id: string;
  name: string;
  weddingDate: string | null;
  confirmedGuests: number;
  tasksDone: number;
  tasksTotal: number;
  tasksOverdue: number;
};

type TaskRollupRow = {
  project_id: string;
  status: string;
  due_date: string | null;
};

type GuestConfirmedRow = {
  project_id: string;
};

export function buildWeddingCardModels(
  projects: PlannerProjectSummary[],
  tasks: TaskRollupRow[],
  confirmedGuestRows: GuestConfirmedRow[],
  now: Date = new Date(),
): WeddingCardModel[] {
  const guestsByProject = new Map<string, number>();
  for (const row of confirmedGuestRows) {
    guestsByProject.set(
      row.project_id,
      (guestsByProject.get(row.project_id) ?? 0) + 1,
    );
  }

  const rollupByProject = new Map<
    string,
    { done: number; total: number; overdue: number }
  >();
  for (const task of tasks) {
    const bucket = rollupByProject.get(task.project_id) ?? {
      done: 0,
      total: 0,
      overdue: 0,
    };
    bucket.total += 1;
    if (task.status === "done") {
      bucket.done += 1;
    } else if (isTaskPastDue(task.due_date, task.status, now)) {
      bucket.overdue += 1;
    }
    rollupByProject.set(task.project_id, bucket);
  }

  return projects.map((project) => {
    const rollup = rollupByProject.get(project.id) ?? {
      done: 0,
      total: 0,
      overdue: 0,
    };
    return {
      id: project.id,
      name: project.name,
      weddingDate: project.wedding_date,
      confirmedGuests: guestsByProject.get(project.id) ?? 0,
      tasksDone: rollup.done,
      tasksTotal: rollup.total,
      tasksOverdue: rollup.overdue,
    };
  });
}

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
  now: Date = new Date(),
): UrgentItem[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const soonEnd = new Date(today);
  soonEnd.setDate(soonEnd.getDate() + 7);

  const urgentTasks: Extract<UrgentItem, { kind: "task" }>[] = [];

  for (const task of tasks) {
    if (task.status === "done" || !task.due_date) continue;

    const due = new Date(task.due_date + "T00:00:00");
    due.setHours(0, 0, 0, 0);

    const overdue = isTaskPastDue(task.due_date, task.status, now);
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
