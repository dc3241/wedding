import type { ReactNode } from "react";

/** Shared cadence / overlay chip used on Content pillars and Automations. */
export function AdminScheduleChip({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-well px-3.5 py-2 text-[13px] font-medium text-muted">
      <span className="size-1.5 shrink-0 rounded-full bg-sage" aria-hidden />
      {children}
    </div>
  );
}
