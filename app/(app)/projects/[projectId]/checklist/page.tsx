import { ChecklistTimeline } from "@/components/checklist/ChecklistTimeline";
import { GenerateStarterChecklist } from "@/components/checklist/GenerateStarterChecklist";
import { PhaseGroup } from "@/components/checklist/PhaseGroup";
import type { ChecklistTask } from "@/components/checklist/TaskRow";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
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
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const { data: tasks } = await supabase
    .from("tasks")
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
        phase !== null &&
        !PHASE_ORDER.includes(phase as (typeof PHASE_ORDER)[number]),
    )
    .sort()
    .map((phase) => ({ phase, label: phase }));

  const sections = [
    ...knownPhases,
    ...extraPhases,
    { phase: null, label: "Other" },
  ];

  return (
    <div className={stackClass}>
      {taskList.length === 0 && (
        <GenerateStarterChecklist projectId={projectId} />
      )}

      {taskList.length > 0 ? (
        <ChecklistTimeline>
          {sections.map(({ phase, label }, index) => (
            <PhaseGroup
              key={label}
              label={label}
              phase={phase}
              tasks={byPhase.get(phase) ?? []}
              projectId={projectId}
              isLast={index === sections.length - 1}
            />
          ))}
        </ChecklistTimeline>
      ) : null}
    </div>
  );
}
