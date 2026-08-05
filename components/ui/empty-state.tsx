import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  /** Optional action area (e.g. AskAssistantPrompt) — stays inside this raised surface */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-surface px-8 py-12 text-center shadow-raised",
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
