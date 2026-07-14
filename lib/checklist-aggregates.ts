import {
  formatPhaseTargetLabel,
  isCanonicalPhase,
  PHASE_ORDER,
  phaseTargetDate,
  type ChecklistPhase,
} from "@/lib/checklist-phases";

export type AggregateTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  phase: string | null;
  due_date: string | null;
  position: number;
};

export type PhaseProgress = {
  phase: string;
  done: number;
  total: number;
  targetLabel: string | null;
};

export type UpNextTask = {
  id: string;
  title: string;
  phase: string | null;
};

export type ChecklistAggregates = {
  total: number;
  done: number;
  remaining: number;
  percent: number;
  phases: PhaseProgress[];
  activePhase: string | null;
  upNext: UpNextTask[];
};

function phaseSortKey(phase: string | null): number {
  if (phase === null) return PHASE_ORDER.length + 1;
  const idx = PHASE_ORDER.indexOf(phase as ChecklistPhase);
  return idx === -1 ? PHASE_ORDER.length : idx;
}

function isDone(status: AggregateTask["status"]) {
  return status === "done";
}

export function computeChecklistAggregates(
  tasks: AggregateTask[],
  weddingDate: string | null,
): ChecklistAggregates {
  const total = tasks.length;
  const done = tasks.filter((t) => isDone(t.status)).length;
  const remaining = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const byPhase = new Map<string | null, AggregateTask[]>();
  for (const task of tasks) {
    const bucket = byPhase.get(task.phase) ?? [];
    bucket.push(task);
    byPhase.set(task.phase, bucket);
  }

  const knownPhases = PHASE_ORDER.map((phase) => phase as string);
  const extraPhases = [...byPhase.keys()]
    .filter(
      (phase): phase is string =>
        phase !== null && !isCanonicalPhase(phase),
    )
    .sort();

  const phaseKeys: (string | null)[] = [
    ...knownPhases,
    ...extraPhases,
    null,
  ];

  const phases: PhaseProgress[] = [];
  for (const phase of phaseKeys) {
    const bucket = byPhase.get(phase) ?? [];
    if (bucket.length === 0) continue;

    const label = phase ?? "Other";
    const phaseDone = bucket.filter((t) => isDone(t.status)).length;
    const targetIso =
      weddingDate && phase !== null
        ? phaseTargetDate(weddingDate, phase)
        : null;

    phases.push({
      phase: label,
      done: phaseDone,
      total: bucket.length,
      targetLabel: targetIso ? formatPhaseTargetLabel(targetIso) : null,
    });
  }

  let activePhase: string | null = null;
  for (const phase of phaseKeys) {
    const bucket = byPhase.get(phase) ?? [];
    if (bucket.some((t) => !isDone(t.status))) {
      activePhase = phase ?? "Other";
      break;
    }
  }

  const incomplete = tasks
    .filter((t) => !isDone(t.status))
    .sort((a, b) => {
      const phaseDiff = phaseSortKey(a.phase) - phaseSortKey(b.phase);
      if (phaseDiff !== 0) return phaseDiff;
      return a.position - b.position;
    });

  const upNext: UpNextTask[] = incomplete.slice(0, 3).map((t) => ({
    id: t.id,
    title: t.title,
    phase: t.phase,
  }));

  return {
    total,
    done,
    remaining,
    percent,
    phases,
    activePhase,
    upNext,
  };
}
