import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  /** Optional action area (e.g. AskAssistantPrompt) — stays inside this raised surface */
  action?: ReactNode;
  className?: string;
  /** Recessed well when this empty sits inside surface chrome, not on canvas. */
  recessed?: boolean;
};

export function EmptyState({
  children,
  action,
  className,
  recessed = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        recessed
          ? "rounded-[var(--radius-inner)] bg-well px-4 py-6 text-center shadow-recessed"
          : "rounded-[var(--radius-card)] bg-surface px-8 py-12 text-center shadow-raised",
        className,
      )}
    >
      <p className="font-display text-[19px] tracking-[-0.02em] text-ink">
        {children}
      </p>
      {action ? <div className="mx-auto mt-5 max-w-md">{action}</div> : null}
    </div>
  );
}
