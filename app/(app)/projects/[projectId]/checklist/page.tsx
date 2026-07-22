import { ChecklistBoard } from "@/components/checklist/ChecklistBoard";
import { GenerateStarterChecklist } from "@/components/checklist/GenerateStarterChecklist";
import type { ChecklistTask } from "@/components/checklist/TaskRow";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import {
  computeChecklistAggregates,
  type AggregateTask,
} from "@/lib/checklist-aggregates";
import {
  isCanonicalPhase,
  isPhaseBeyondRunway,
  PHASE_ORDER,
  phaseTargetDate,
} from "@/lib/checklist-phases";
import { wholeMonthsBetween } from "@/lib/date-months";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

type TaskRow = AggregateTask & {
  vendor_id: string | null;
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

function formatPhaseMetaDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildSections(tasks: TaskRow[], weddingDate: string | null) {
  const byPhase = groupByPhase(tasks);
  const runwayMonths =
    weddingDate != null
      ? Math.max(0, wholeMonthsBetween(todayIsoDate(), weddingDate))
      : null;

  const knownPhases = PHASE_ORDER.map((phase) => ({
    phase: phase as string | null,
    label: phase,
  }));

  const extraPhases = [...byPhase.keys()]
    .filter(
      (phase): phase is string =>
        phase !== null && !isCanonicalPhase(phase),
    )
    .sort()
    .map((phase) => ({ phase: phase as string | null, label: phase }));

  const sectionDefs = [
    ...knownPhases,
    ...extraPhases,
    { phase: null as string | null, label: "Other" },
  ];

  return sectionDefs
    .map(({ phase, label }) => {
      const phaseTasks = byPhase.get(phase) ?? [];
      const done = phaseTasks.filter((t) => t.status === "done").length;
      const targetIso =
        weddingDate && phase !== null
          ? phaseTargetDate(weddingDate, phase)
          : null;
      return {
        phase,
        label,
        tasks: phaseTasks,
        done,
        total: phaseTasks.length,
        targetLabel: targetIso
          ? formatPhaseMetaDate(targetIso)
          : null,
      };
    })
    .filter((section) => {
      // Other: only when it has tasks.
      if (section.phase === null) return section.total > 0;
      // Always keep phases that already have tasks (e.g. date moved earlier).
      if (section.total > 0) return true;
      // Empty canonical buckets: keep for add-task only when within runway
      // (or when no wedding date — all buckets stay available).
      if (runwayMonths === null) return true;
      return !isPhaseBeyondRunway(section.phase, runwayMonths);
    });
}

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

  const [{ data: tasks }, { data: project }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, phase, due_date, vendor_id, position")
      .eq("project_id", projectId)
      .order("phase", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("projects")
      .select("name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  const taskList = (tasks ?? []) as TaskRow[];
  const weddingDate = project?.wedding_date ?? null;
  const projectName = project?.name ?? "Your wedding";
  const aggregates = computeChecklistAggregates(taskList, weddingDate);
  const sections = buildSections(taskList, weddingDate);

  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      {taskList.length === 0 ? (
        <div className="space-y-6">
          <PageHeader title="Checklist" eyebrow={eyebrow} />
          <GenerateStarterChecklist projectId={projectId} />
        </div>
      ) : (
        <ChecklistBoard
          projectId={projectId}
          projectName={projectName}
          weddingDate={weddingDate}
          aggregates={aggregates}
          sections={sections}
        />
      )}
    </div>
  );
}
