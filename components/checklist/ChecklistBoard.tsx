"use client";

import Link from "next/link";
import { useState } from "react";
import { AddTask } from "@/components/checklist/AddTask";
import { TaskRow, type ChecklistTask } from "@/components/checklist/TaskRow";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import type {
  ChecklistAggregates,
  PhaseProgress,
  UpNextTask,
} from "@/lib/checklist-aggregates";
import { cn } from "@/lib/cn";

export type ChecklistSection = {
  phase: string | null;
  label: string;
  tasks: ChecklistTask[];
  done: number;
  total: number;
  targetLabel: string | null;
};

type ChecklistBoardProps = {
  projectId: string;
  projectName: string;
  weddingDate: string | null;
  aggregates: ChecklistAggregates;
  sections: ChecklistSection[];
};

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDue(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ProgressBand({
  aggregates,
}: {
  aggregates: ChecklistAggregates;
}) {
  const { percent, done, total, phases, activePhase, daysUntilWedding } =
    aggregates;

  return (
    <Card className="p-[30px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
            {percent}%
          </p>
          <p className="mt-2 text-[14px] font-medium text-muted">
            {done} of {total} done
          </p>
        </div>
        {daysUntilWedding != null ? (
          <div className="text-left md:text-right">
            <p className="font-display text-[22px] font-extrabold leading-none tracking-[-0.05em] tabular-nums text-muted">
              {daysUntilWedding}
            </p>
            <p className="mt-1 text-[14px] font-medium text-muted">days to go</p>
          </div>
        ) : null}
      </div>

      <div
        className="h-4 overflow-hidden rounded-[var(--radius-pill)] bg-[#EDE4E8] p-[3px]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% of checklist complete`}
      >
        <div
          className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-6 flex flex-wrap gap-2.5">
        {phases.map((phase) => (
          <PhaseChip
            key={phase.phase}
            phase={phase}
            active={phase.phase === activePhase}
          />
        ))}
      </ul>
    </Card>
  );
}

function PhaseChip({
  phase,
  active,
}: {
  phase: PhaseProgress;
  active: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-pill)] px-[15px] py-[9px] text-[13px] font-semibold tabular-nums",
        active ? "bg-accent text-surface" : "bg-well text-muted",
      )}
    >
      <span>{phase.phase}</span>
      <span className={cn("font-medium", active ? "opacity-90" : "opacity-75")}>
        {phase.done} of {phase.total}
        {phase.targetLabel != null ? ` · by ${phase.targetLabel}` : ""}
      </span>
    </li>
  );
}

function SetWeddingDateCard({ projectId }: { projectId: string }) {
  return (
    <Card className="px-6 py-[22px]">
      <Eyebrow className="text-muted">Wedding date</Eyebrow>
      <p className="mt-3 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Set your date
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Turns these phases into real deadlines and flags what&apos;s overdue.
      </p>
      <Link
        href={`/projects/${projectId}`}
        className="mt-4 inline-block text-[14px] font-semibold text-accent hover:opacity-80"
      >
        Set date on overview →
      </Link>
    </Card>
  );
}

function ActivePhaseRail({ aggregates }: { aggregates: ChecklistAggregates }) {
  const {
    activePhase,
    activePhaseDaysUntil,
    activePhaseOpenCount,
  } = aggregates;

  if (activePhase == null || activePhaseDaysUntil == null) return null;

  const openWords: Record<number, string> = {
    0: "No open tasks in it.",
    1: "One task still open in it.",
    2: "Two tasks still open in it.",
  };
  const openLabel =
    openWords[activePhaseOpenCount] ??
    `${activePhaseOpenCount} tasks still open in it.`;

  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Up next
      </p>
      <p className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
        {activePhaseDaysUntil} days
      </p>
      <p className="mt-[7px] text-[13px] leading-relaxed text-muted">
        until the {activePhase} phase target. {openLabel}
      </p>
    </Card>
  );
}

function OpenNowRail({ tasks }: { tasks: UpNextTask[] }) {
  return (
    <Card className="px-6 py-[22px]">
      <p className="mb-[15px] text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Open right now
      </p>
      {tasks.length === 0 ? (
        <p className="text-[15px] font-medium text-muted">All caught up.</p>
      ) : (
        <ul>
          {tasks.map((task) => {
            const due = formatShortDue(task.due_date);
            const status =
              task.status === "in_progress" ? "In progress" : "Not started";
            return (
              <li
                key={task.id}
                className="border-t border-hairline py-[11px] text-[15px] font-medium leading-snug text-ink first:border-t-0 first:pt-0"
              >
                {task.title}
                <span className="mt-[3px] block text-[13px] font-normal text-muted">
                  {status}
                  {due ? ` · due ${due}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PhaseSection({
  section,
  projectId,
  hideDone,
  open,
  onToggle,
}: {
  section: ChecklistSection;
  projectId: string;
  hideDone: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const visible = hideDone
    ? section.tasks.filter((t) => t.status !== "done")
    : section.tasks;

  const meta = [
    `${section.done} of ${section.total} done`,
    section.targetLabel != null ? `by ${section.targetLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <details
      className="mb-4 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised last:mb-0"
      open={open}
    >
      <summary
        className="flex cursor-pointer list-none items-baseline justify-between gap-3.5 px-6 py-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {section.label}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[13px] font-medium text-muted">
          {meta}
        </span>
      </summary>

      <div className="px-3.5 pb-3.5">
        {visible.length > 0 ? (
          <ul>
            {visible.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : null}
        <AddTask projectId={projectId} phase={section.phase} />
      </div>
    </details>
  );
}

export function ChecklistBoard({
  projectId,
  projectName,
  weddingDate,
  aggregates,
  sections,
}: ChecklistBoardProps) {
  const [hideDone, setHideDone] = useState(false);
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      // Open phases that still have work; collapse fully done ones.
      initial[section.label] = section.done < section.total;
    }
    return initial;
  });

  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  function togglePhase(key: string) {
    setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Checklist" eyebrow={eyebrow} />

      <ProgressBand aggregates={aggregates} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] font-medium text-muted">
          {aggregates.remaining} open · {aggregates.done} done
        </p>
        <button
          type="button"
          aria-pressed={hideDone}
          onClick={() => setHideDone((v) => !v)}
          className={cn(
            "rounded-[var(--radius-pill)] px-4 py-2.5 text-[14px] font-semibold transition-colors",
            hideDone
              ? "bg-accent text-surface"
              : "bg-accent-wash text-accent",
          )}
        >
          {hideDone ? "Show done" : "Hide done"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          {sections.map((section) => {
            const key = section.label;
            return (
              <PhaseSection
                key={key}
                section={section}
                projectId={projectId}
                hideDone={hideDone}
                open={openPhases[key] ?? true}
                onToggle={() => togglePhase(key)}
              />
            );
          })}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          {weddingDate == null ? (
            <SetWeddingDateCard projectId={projectId} />
          ) : (
            <ActivePhaseRail aggregates={aggregates} />
          )}
          <OpenNowRail tasks={aggregates.upNext} />
        </aside>
      </div>
    </div>
  );
}
