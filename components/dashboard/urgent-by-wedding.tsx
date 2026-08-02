"use client";

import Link from "next/link";
import { useState } from "react";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import type { UrgentItem } from "@/lib/dashboard-aggregates";

type ProjectDate = {
  id: string;
  wedding_date: string | null;
};

function formatDueDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function urgentLabel(item: UrgentItem) {
  if (item.kind === "task") {
    return item.overdue ? "Overdue" : "Due soon";
  }
  return item.status === "to_contact" ? "To contact" : "Awaiting reply";
}

function urgentVariant(item: UrgentItem): "rosewood" | "clay" | undefined {
  if (item.kind === "task") {
    return item.overdue ? "rosewood" : "clay";
  }
  return undefined;
}

function urgentHref(item: UrgentItem) {
  if (item.kind === "task") {
    return `/projects/${item.projectId}/checklist`;
  }
  return `/projects/${item.projectId}/vendors`;
}

function urgentTitle(item: UrgentItem) {
  if (item.kind === "task") return item.title;
  return item.vendorName;
}

function sortItemsInCard(items: UrgentItem[]): UrgentItem[] {
  const tasks = items
    .filter((item): item is Extract<UrgentItem, { kind: "task" }> => item.kind === "task")
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  const vendors = items.filter((item) => item.kind === "vendor");
  return [...tasks, ...vendors];
}

function WeddingUrgentCard({ items }: { items: UrgentItem[] }) {
  const [open, setOpen] = useState(false);
  const sorted = sortItemsInCard(items);
  const projectName = sorted[0]?.projectName ?? "Wedding";
  const soonestTask = sorted.find(
    (item): item is Extract<UrgentItem, { kind: "task" }> => item.kind === "task",
  );

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-medium text-ink">
              {projectName}
            </span>
            <Pill>{sorted.length}</Pill>
          </div>
          {soonestTask ? (
            <p className="mt-0.5 text-[13px] text-muted">
              Due {formatDueDate(soonestTask.dueDate)}
            </p>
          ) : null}
        </div>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-[13px] text-muted transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open ? (
        <ul className="space-y-2 px-3.5 pb-3.5">
          {sorted.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                href={urgentHref(item)}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed transition-colors hover:bg-hairline"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium text-ink">
                    {urgentTitle(item)}
                  </div>
                  {item.kind === "task" ? (
                    <div className="mt-0.5 truncate text-[13px] text-muted">
                      · due {formatDueDate(item.dueDate)}
                    </div>
                  ) : null}
                </div>
                <Pill variant={urgentVariant(item)}>{urgentLabel(item)}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function UrgentByWedding({
  urgentItems,
  activeProjects,
}: {
  urgentItems: UrgentItem[];
  activeProjects: ProjectDate[];
}) {
  const weddingDateById = new Map(
    activeProjects.map((project) => [project.id, project.wedding_date]),
  );

  const byProject = new Map<string, UrgentItem[]>();
  for (const item of urgentItems) {
    const existing = byProject.get(item.projectId);
    if (existing) {
      existing.push(item);
    } else {
      byProject.set(item.projectId, [item]);
    }
  }

  const groups = [...byProject.entries()].sort(([aId], [bId]) => {
    const aDate = weddingDateById.get(aId) ?? null;
    const bDate = weddingDateById.get(bId) ?? null;
    if (aDate === bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });

  return (
    <div className="space-y-3">
      {groups.map(([projectId, items]) => (
        <WeddingUrgentCard key={projectId} items={items} />
      ))}
    </div>
  );
}
