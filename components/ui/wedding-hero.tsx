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
    <div className="mt-[34px]">
      <div className="font-display tabnum text-[64px] leading-none text-plum">
        {days}
      </div>
      <div className="mt-1.5 text-[13px] tracking-[0.04em] text-ink-muted">
        days to go
      </div>
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
    <div className="mx-auto w-full max-w-[760px]">
      <section
        className={cn("animate-rise px-0 py-2 pb-10 text-center", className)}
      >
        <div className="font-display text-[clamp(40px,6vw,54px)] tracking-[0.005em] text-ink">
          {coupleNames}
        </div>
        {displayDate ? (
          <div className="tabnum mt-3.5 text-base text-ink-muted">
            {displayDate}
          </div>
        ) : (
          <div className="mt-3.5 text-base text-ink-muted">No date set</div>
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
      <div className="mt-2 h-px bg-stone" aria-hidden />
    </div>
  );
}
