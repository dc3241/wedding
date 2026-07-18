import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "emotional";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  /** Accent-wash icon chip — emotional variant only */
  icon?: ReactNode;
};

export function Card({
  className,
  variant = "default",
  icon,
  children,
  ...props
}: CardProps) {
  const emotional = variant === "emotional";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-surface",
        emotional ? "shadow-card-emotional" : "shadow-raised",
        icon ? "flex items-start gap-4 p-6" : null,
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-accent-wash text-accent"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      {icon ? <div className="min-w-0 flex-1">{children}</div> : children}
    </div>
  );
}
