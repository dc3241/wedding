import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-transparent bg-plum-tint px-8 py-12 text-center",
        className,
      )}
    >
      <p className="font-display text-[21px] text-plum-deep">{children}</p>
    </div>
  );
}
