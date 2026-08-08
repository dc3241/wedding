"use client";

import { useTour } from "@/components/tour/TourProvider";
import { cn } from "@/lib/cn";

type TourHelpButtonProps = {
  tourKey?: string;
  className?: string;
};

/** Replay affordance — always starts the tour; does not write on open. */
export function TourHelpButton({
  tourKey = "overview",
  className,
}: TourHelpButtonProps) {
  const { startTour } = useTour();

  return (
    <button
      type="button"
      onClick={() => startTour(tourKey)}
      aria-label="Show page tour"
      title="Show page tour"
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-ring bg-surface text-[15px] font-semibold text-muted transition-[color,background,border-color] duration-150 hover:border-accent hover:bg-accent-wash hover:text-accent",
        className,
      )}
    >
      ?
    </button>
  );
}
