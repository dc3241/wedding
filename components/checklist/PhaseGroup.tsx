import { AddTask } from "./AddTask";
import { TaskRow, type ChecklistTask } from "./TaskRow";

export function PhaseGroup({
  label,
  phase,
  tasks,
  projectId,
}: {
  label: string;
  phase: string | null;
  tasks: ChecklistTask[];
  projectId: string;
}) {
  return (
    <section className="space-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </h2>
      {tasks.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
      <AddTask projectId={projectId} phase={phase} />
    </section>
  );
}
