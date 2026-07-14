"use client";

import Link from "next/link";
import { useState } from "react";
import { AddTask } from "@/components/checklist/AddTask";
import { TaskRow, type ChecklistTask } from "@/components/checklist/TaskRow";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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
};

type ChecklistBoardProps = {
  projectId: string;
  weddingDate: string | null;
  aggregates: ChecklistAggregates;
  sections: ChecklistSection[];
};

function ProgressBand({
  aggregates,
}: {
  aggregates: ChecklistAggregates;
}) {
  const { percent, done, total, remaining, phases, activePhase } = aggregates;

  return (
    <Card className="px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-[15px] text-ink">
          <span className="font-medium tabular-nums text-ink">{percent}%</span>
          <span className="text-ink-muted">
            {" "}
            · {done} of {total} done
          </span>
        </p>
        <p className="text-[13px] tabular-nums text-ink-muted">
          {remaining} remaining
        </p>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-soft"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% of checklist complete`}
      >
        <div
          className="h-full rounded-full bg-plum transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-3.5 flex flex-wrap gap-1.5">
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
  const window =
    phase.targetLabel != null ? ` · by ${phase.targetLabel}` : "";

  return (
    <li
      className={cn(
        "rounded-full border px-2.5 py-1 text-[12px] tabular-nums",
        active
          ? "border-plum text-plum"
          : "border-stone text-ink-muted",
      )}
    >
      {phase.phase} · {phase.done}/{phase.total}
      {window}
    </li>
  );
}

function SetWeddingDateCard({ projectId }: { projectId: string }) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-plum-tint/40 text-plum"
          aria-hidden
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
            <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-plum">Set wedding date</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-muted">
            Turns these phases into real deadlines and flags what&apos;s overdue
          </p>
          <Link
            href={`/projects/${projectId}`}
            className="mt-2.5 inline-block text-[13px] font-medium text-plum hover:text-plum-deep"
          >
            Set date on overview →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function UpNextRail({ tasks }: { tasks: UpNextTask[] }) {
  return (
    <div>
      <Eyebrow>Up next</Eyebrow>
      {tasks.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-muted">All caught up.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-plum"
                aria-hidden
              />
              <span className="min-w-0 text-[14px] leading-snug text-ink">
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhaseSection({
  section,
  projectId,
  hideDone,
  collapsed,
  onToggle,
}: {
  section: ChecklistSection;
  projectId: string;
  hideDone: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const visible = hideDone
    ? section.tasks.filter((t) => t.status !== "done")
    : section.tasks;

  return (
    <li className="border-b border-stone last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 py-2.5 text-left"
      >
        <span
          className={cn(
            "text-ink-muted transition-transform",
            collapsed ? "-rotate-90" : "rotate-0",
          )}
          aria-hidden
        >
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
            <path d="M2.5 4.25L6 7.75l3.5-3.5" />
          </svg>
        </span>
        <span className="text-[15px] font-medium text-ink">
          {section.label}
          <span className="ml-1.5 font-normal tabular-nums text-ink-muted">
            · {section.done}/{section.total}
          </span>
        </span>
      </button>

      {!collapsed ? (
        <div className="pb-3 pl-5">
          {visible.length > 0 ? (
            <ul className="divide-y divide-stone">
              {visible.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          ) : null}
          <AddTask projectId={projectId} phase={section.phase} />
        </div>
      ) : null}
    </li>
  );
}

export function ChecklistBoard({
  projectId,
  weddingDate,
  aggregates,
  sections,
}: ChecklistBoardProps) {
  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function togglePhase(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-5">
      <ProgressBand aggregates={aggregates} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Eyebrow>Tasks</Eyebrow>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="size-3.5 rounded border-stone text-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
              />
              Hide done
            </label>
          </div>

          <Card className="px-4 py-1 sm:px-5">
            <ul>
              {sections.map((section) => {
                const key = section.label;
                return (
                  <PhaseSection
                    key={key}
                    section={section}
                    projectId={projectId}
                    hideDone={hideDone}
                    collapsed={Boolean(collapsed[key])}
                    onToggle={() => togglePhase(key)}
                  />
                );
              })}
            </ul>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          {weddingDate == null ? (
            <SetWeddingDateCard projectId={projectId} />
          ) : null}
          <Card className="p-4 sm:p-5">
            <UpNextRail tasks={aggregates.upNext} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
