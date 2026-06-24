import { GenerateStarterChecklist } from "@/components/checklist/GenerateStarterChecklist";
import { PhaseGroup } from "@/components/checklist/PhaseGroup";
import type { ChecklistTask } from "@/components/checklist/TaskRow";
import { createClient } from "@/utils/supabase/server";

const PHASE_ORDER = [
  "12+ months",
  "9 months",
  "6 months",
  "3 months",
  "1 month",
  "week of",
] as const;

type TaskRow = {
  id: string;
  title: string;
  status: ChecklistTask["status"];
  phase: string | null;
  due_date: string | null;
  vendor_id: string | null;
  position: number;
};

function groupByPhase(tasks: TaskRow[]) {
  const groups = new Map<string | null, ChecklistTask[]>();

  for (const task of tasks) {
    const bucket = groups.get(task.phase) ?? [];
    bucket.push({
      id: task.id,
      title: task.title,
      status: task.status,
      due_date: task.due_date,
    });
    groups.set(task.phase, bucket);
  }

  return groups;
}

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    // TODO: link tasks.vendor_id to vendors roster rows for coordination UI
    .select("id, title, status, phase, due_date, vendor_id, position")
    .eq("project_id", projectId)
    .order("phase", { ascending: true })
    .order("position", { ascending: true });

  const taskList = (tasks ?? []) as TaskRow[];
  const byPhase = groupByPhase(taskList);

  const knownPhases = PHASE_ORDER.map((phase) => ({
    phase,
    label: phase,
  }));

  const extraPhases = [...byPhase.keys()]
    .filter(
      (phase): phase is string =>
        phase !== null && !PHASE_ORDER.includes(phase as (typeof PHASE_ORDER)[number])
    )
    .sort()
    .map((phase) => ({ phase, label: phase }));

  const sections = [
    ...knownPhases,
    ...extraPhases,
    { phase: null, label: "Other" },
  ];

  return (
    <div className="space-y-8">
      {taskList.length === 0 && (
        <GenerateStarterChecklist projectId={projectId} />
      )}
      {sections.map(({ phase, label }) => (
        <PhaseGroup
          key={label}
          label={label}
          phase={phase}
          tasks={byPhase.get(phase) ?? []}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
