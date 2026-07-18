"use client";

import { WeddingDateEditor } from "@/components/ui/wedding-date-editor";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

type WeddingHeroProps = {
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

function formatWeddingDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CountdownNumber({ weddingDate }: { weddingDate: string }) {
  const [days, setDays] = useState(() => daysUntilWedding(weddingDate));

  useEffect(() => {
    setDays(daysUntilWedding(weddingDate));
    const interval = window.setInterval(() => {
      setDays(daysUntilWedding(weddingDate));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  return (
    <div className="mt-8">
      <div className="font-display text-[52px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[64px]">
        {days}
      </div>
      <div className="mt-2 text-[14px] font-medium text-muted">days to go</div>
    </div>
  );
}

export function WeddingHero({
  coupleNames,
  weddingDate,
  projectId,
  dateLabel,
  className,
}: WeddingHeroProps) {
  const displayDate =
    dateLabel ?? (weddingDate ? formatWeddingDate(weddingDate) : null);
  const canEdit = Boolean(projectId);

  return (
    <div className="w-full">
      <section
        className={cn(
          "animate-rise rounded-[var(--radius-card)] bg-surface px-8 py-10 text-center shadow-raised sm:px-10 sm:py-12",
          className,
        )}
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          Overview
        </p>
        <h1 className="mt-2 font-display text-[32px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[42px]">
          {coupleNames}
        </h1>
        {displayDate ? (
          <p className="mt-3 text-[15px] font-medium tabular-nums text-muted">
            {displayDate}
          </p>
        ) : (
          <p className="mt-3 text-[15px] font-medium text-muted">No date set</p>
        )}
        {canEdit && projectId ? (
          <div className="mt-3 flex justify-center">
            <WeddingDateEditor
              projectId={projectId}
              weddingDate={weddingDate}
              align="center"
            />
          </div>
        ) : null}
        {weddingDate ? <CountdownNumber weddingDate={weddingDate} /> : null}
      </section>
    </div>
  );
}
