import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "emotional";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  /** Plum-tint icon chip — emotional variant only */
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
        "rounded-lg border border-stone bg-surface",
        emotional ? "shadow-card-emotional" : "shadow-card",
        icon ? "flex items-start gap-4 p-6" : null,
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-plum-tint/40 text-plum"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      {icon ? <div className="min-w-0 flex-1">{children}</div> : children}
    </div>
  );
}
