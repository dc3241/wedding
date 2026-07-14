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
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
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
    <div className="tabnum shrink-0 text-sm text-ink">
      <span className="font-medium text-plum">{days} days</span> to go
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
        "mb-6 flex items-center justify-between gap-6 rounded-lg border border-stone bg-surface px-5 py-3.5 shadow-card",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="font-display text-[26px] leading-none text-ink">
          {coupleNames}
        </span>
        {displayDate ? (
          <span className="tabnum truncate text-sm text-ink-muted">
            {displayDate}
          </span>
        ) : (
          <span className="text-sm text-ink-muted">No date set</span>
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
