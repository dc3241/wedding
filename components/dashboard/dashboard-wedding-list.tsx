"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProjectArchived } from "@/app/(app)/dashboard/actions";
import { WeddingCards } from "@/components/dashboard/wedding-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/cn";
import {
  parseLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import type {
  PlannerProjectSummary,
  WeddingCardModel,
} from "@/lib/dashboard-aggregates";
import type { AccountPlan } from "@/lib/account-context";
import { getCopy } from "@/lib/venue-copy";

function formatArchivedDate(date: string | null) {
  if (!date) return "No date set";
  return parseLocalDateKey(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardWeddingList({
  activeWeddingCards,
  archivedProjects,
  plan = "planner",
}: {
  activeWeddingCards: WeddingCardModel[];
  archivedProjects: PlannerProjectSummary[];
  plan?: AccountPlan;
}) {
  const router = useRouter();
  const [view, setView] = useState<"active" | "archived">("active");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive(project: { id: string; name: string }) {
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

  const activeEmpty = activeWeddingCards.length === 0;
  const archivedEmpty = archivedProjects.length === 0;
  const isEmpty = view === "active" ? activeEmpty : archivedEmpty;

  return (
    <section>
      <SectionHeader>{getCopy("dashboardSection", plan)}</SectionHeader>
      <div className="mb-3 flex justify-end">
        <div
          role="tablist"
          aria-label={getCopy("projectListAria", plan)}
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

      {isEmpty ? (
        <EmptyState>
          {view === "archived"
            ? getCopy("emptyArchived", plan)
            : getCopy("emptyProjects", plan)}
        </EmptyState>
      ) : view === "active" ? (
        <WeddingCards
          cards={activeWeddingCards}
          archiveDisabled={isPending}
          onArchive={(card) =>
            handleArchive({ id: card.id, name: card.name })
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised">
          <div className="divide-y divide-hairline">
            {archivedProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between gap-4 bg-well px-5 py-4"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="min-w-0 flex-1 no-underline transition-opacity hover:opacity-90"
                >
                  <div className="truncate text-[19px] font-extrabold tracking-[-0.02em] text-muted">
                    {project.name}
                  </div>
                  <div className="mt-0.5 text-[13px] tabular-nums text-muted">
                    {formatArchivedDate(project.wedding_date)}
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUnarchive(project)}
                    className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Unarchive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
