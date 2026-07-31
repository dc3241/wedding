"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProjectArchived } from "@/app/(app)/dashboard/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/cn";
import type { PlannerProjectSummary } from "@/lib/dashboard-aggregates";

function formatWeddingDate(date: string | null) {
  if (!date) return "No date set";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(date + "T00:00:00");
  return Math.max(
    0,
    Math.ceil((wedding.getTime() - today.getTime()) / 86_400_000),
  );
}

export function DashboardWeddingList({
  activeProjects,
  archivedProjects,
}: {
  activeProjects: PlannerProjectSummary[];
  archivedProjects: PlannerProjectSummary[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"active" | "archived">("active");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const projects = view === "active" ? activeProjects : archivedProjects;

  function handleArchive(project: PlannerProjectSummary) {
    if (
      !window.confirm(
        `Archive ${project.name}? You can unarchive anytime from the Archived view.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setProjectArchived(project.id, true);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUnarchive(project: PlannerProjectSummary) {
    setError(null);
    startTransition(async () => {
      const result = await setProjectArchived(project.id, false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section>
      <SectionHeader>Weddings</SectionHeader>
      <div className="mb-3 flex justify-end">
        <div
          role="tablist"
          aria-label="Wedding list"
          className={cn(
            "flex rounded-[var(--radius-pill)] bg-well p-[3px] shadow-recessed",
            isPending && "opacity-60",
          )}
        >
          {(
            [
              { id: "active", label: "Active" },
              { id: "archived", label: "Archived" },
            ] as const
          ).map(({ id, label }) => {
            const selected = view === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                disabled={isPending}
                onClick={() => setView(id)}
                className={cn(
                  "cursor-pointer rounded-[var(--radius-pill)] border-none bg-transparent px-3.5 py-1.5 text-[13px] font-semibold text-muted transition-[color,background] duration-150 disabled:cursor-not-allowed",
                  selected && "bg-surface text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="mb-3 text-[13px] text-rosewood">{error}</p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState>
          {view === "archived"
            ? "No archived weddings yet."
            : "No weddings yet. Create your first client wedding to get started."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-raised)]">
          <div className="divide-y divide-hairline">
            {projects.map((project) => {
              const days = daysUntil(project.wedding_date);
              const statusActive = project.status === "active";
              const muted = view === "archived";

              return (
                <div
                  key={project.id}
                  className={cn(
                    "flex items-center justify-between gap-4 px-5 py-4",
                    muted && "bg-well",
                  )}
                >
                  <Link
                    href={`/projects/${project.id}`}
                    className="min-w-0 flex-1 no-underline transition-opacity hover:opacity-90"
                  >
                    <div
                      className={cn(
                        "truncate text-[19px] font-extrabold tracking-[-0.02em]",
                        muted ? "text-muted" : "text-ink",
                      )}
                    >
                      {project.name}
                    </div>
                    <div className="mt-0.5 text-[13px] tabular-nums text-muted">
                      {formatWeddingDate(project.wedding_date)}
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    {view === "active" && days !== null ? (
                      <span className="text-[13px] tabular-nums text-muted">
                        {days}d
                      </span>
                    ) : null}
                    {view === "active" ? (
                      <>
                        <Pill variant={statusActive ? "sage" : undefined}>
                          {statusActive ? "Active" : project.status}
                        </Pill>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleArchive(project)}
                          className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleUnarchive(project)}
                        className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Unarchive
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
