"use client";

import { WeddingDateEditor } from "@/components/ui/wedding-date-editor";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type SlimHeroProps = {
  coupleNames: string;
  weddingDate: string | null;
  /** When set, enables the inline wedding-date editor (SET-01). */
  projectId?: string;
  dateLabel?: string | null;
  className?: string;
};

function daysUntilWedding(weddingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(weddingDate + "T00:00:00");
  wedding.setHours(0, 0, 0, 0);
  const diff = wedding.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatSlimDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SlimCountdown({ weddingDate }: { weddingDate: string }) {
  const [days, setDays] = useState(() => daysUntilWedding(weddingDate));

  useEffect(() => {
    setDays(daysUntilWedding(weddingDate));
    const interval = window.setInterval(() => {
      setDays(daysUntilWedding(weddingDate));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  return (
    <div className="shrink-0 text-[14px] font-medium tabular-nums text-muted">
      <span className="font-semibold text-accent">{days} days</span> to go
    </div>
  );
}

export function SlimHero({
  coupleNames,
  weddingDate,
  projectId,
  dateLabel,
  className,
}: SlimHeroProps) {
  const displayDate =
    dateLabel ?? (weddingDate ? formatSlimDate(weddingDate) : null);
  const canEdit = Boolean(projectId);

  return (
    <div
      className={cn(
        "mb-6 flex items-center justify-between gap-6 rounded-[var(--radius-card)] bg-surface px-6 py-4 shadow-raised",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-ink">
          {coupleNames}
        </span>
        {displayDate ? (
          <span className="truncate text-[14px] font-medium tabular-nums text-muted">
            {displayDate}
          </span>
        ) : (
          <span className="text-[14px] font-medium text-muted">No date set</span>
        )}
        {canEdit && projectId ? (
          <WeddingDateEditor
            projectId={projectId}
            weddingDate={weddingDate}
          />
        ) : null}
      </div>
      {weddingDate ? <SlimCountdown weddingDate={weddingDate} /> : null}
    </div>
  );
}
