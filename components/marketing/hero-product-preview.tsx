"use client";

import { AnimateWidth } from "@/components/marketing/animate-width";
import { SeatingPreviewFigures } from "@/components/marketing/seating-preview-figures";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import { useState } from "react";

type Tab = "checklist" | "budget" | "seating";

type DemoTask = { id: string; title: string; done: boolean };

const INITIAL_TASKS: DemoTask[] = [
  { id: "florist", title: "Confirm florist delivery window", done: true },
  { id: "guest-count", title: "Send final guest count", done: true },
  { id: "hair", title: "Book hair & makeup trial", done: false },
  { id: "run-sheet", title: "Print day-of run sheet", done: false },
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 10l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroProductPreview() {
  const [tab, setTab] = useState<Tab>("checklist");
  const [tasks, setTasks] = useState<DemoTask[]>(() =>
    INITIAL_TASKS.map((t) => ({ ...t })),
  );

  const doneCount = tasks.filter((t) => t.done).length;
  const percent = Math.round((doneCount / tasks.length) * 100);

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "checklist", label: "Checklist" },
    { id: "budget", label: "Budget" },
    { id: "seating", label: "Seating" },
  ];

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised md:p-6">
      <div
        role="tablist"
        aria-label="Product preview"
        className="mb-5 inline-flex gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`hero-tab-${t.id}`}
            aria-controls={`hero-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "cursor-pointer rounded-[var(--radius-pill)] px-4 py-2 text-[13px] font-semibold transition-[color,background,box-shadow] duration-150",
              tab === t.id
                ? "bg-surface text-ink shadow-raised"
                : "bg-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "checklist" ? (
        <div
          role="tabpanel"
          id="hero-panel-checklist"
          aria-labelledby="hero-tab-checklist"
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-1 block">Checklist</Eyebrow>
              <p className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                12 weeks out
              </p>
            </div>
            <p className="text-[40px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
              {percent}%
            </p>
          </div>
          <div
            className="mb-4 h-3 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% of checklist complete`}
          >
            <div
              className="h-full rounded-[var(--radius-pill)] bg-sage transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3.5 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 text-left shadow-recessed transition-colors duration-150 hover:bg-hairline",
                  task.done && "opacity-90",
                )}
              >
                <span
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 transition-[background,border-color] duration-150",
                    task.done
                      ? "border-sage bg-sage text-surface"
                      : "border-ring bg-surface text-transparent",
                  )}
                >
                  <CheckIcon />
                </span>
                <span
                  className={cn(
                    "text-[15px] font-medium",
                    task.done ? "text-muted line-through" : "text-ink",
                  )}
                >
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "budget" ? (
        <div
          role="tabpanel"
          id="hero-panel-budget"
          aria-labelledby="hero-tab-budget"
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-1 block">Budget</Eyebrow>
              <p className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                Total budget $42,000
              </p>
            </div>
            <p className="text-[40px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
              62%
            </p>
          </div>
          {/* Live BudgetBoard: spent = sage, committed = accent (not clay). */}
          <div
            className="mb-4 flex h-4 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
            role="img"
            aria-label="Spent 44%, committed 18% of budget"
          >
            <AnimateWidth widthPercent={44} className="bg-sage" />
            <AnimateWidth widthPercent={18} className="bg-accent" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Spent", value: "$18,480", swatch: "bg-sage" },
              { label: "Committed", value: "$7,560", swatch: "bg-accent" },
              { label: "Remaining", value: "$15,960", swatch: "bg-ring" },
            ].map((cell) => (
              <div
                key={cell.label}
                className="rounded-[var(--radius-inner)] bg-well p-3.5 shadow-recessed"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                  <span
                    className={cn("inline-block size-2.5 rounded-[3px]", cell.swatch)}
                    aria-hidden
                  />
                  {cell.label}
                </p>
                <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
                  {cell.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "seating" ? (
        <div
          role="tabpanel"
          id="hero-panel-seating"
          aria-labelledby="hero-tab-seating"
        >
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">
              Reception floor
            </span>
            <span className="text-[13px] text-muted">12 of 18 seated</span>
          </div>
          <div className="h-[220px] w-full overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed">
            <SeatingPreviewFigures className="h-full w-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
