import { ProjectOverview } from "@/components/dashboard/project-overview";
import type { OverviewData } from "@/components/dashboard/overview-data";

type PlannerDashboardProps = {
  overview: OverviewData;
};

export function PlannerDashboard({ overview }: PlannerDashboardProps) {
  return <ProjectOverview data={overview} showLastContact />;
}

export function countTasksDueThisWeek(
  tasks: { status: string; due_date: string | null }[],
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return tasks.filter((task) => {
    if (task.status === "done" || !task.due_date) return false;
    const due = new Date(task.due_date + "T00:00:00");
    due.setHours(0, 0, 0, 0);
    return due >= today && due <= weekEnd;
  }).length;
}

export function buildLastContactMap(
  messages: {
    project_vendor_id: string;
    sent_at: string | null;
    updated_at: string | null;
  }[],
) {
  const map = new Map<string, string>();

  for (const message of messages) {
    const at = message.sent_at ?? message.updated_at;
    if (!at) continue;

    const existing = map.get(message.project_vendor_id);
    if (!existing || new Date(at) > new Date(existing)) {
      map.set(message.project_vendor_id, at);
    }
  }

  return map;
}
