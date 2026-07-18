import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type PillVariant = "default" | "sage" | "clay" | "rosewood" | "plum" | "accent";

type PillProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: PillVariant;
};

const variantClasses: Record<PillVariant, string> = {
  default: "bg-well text-muted",
  sage: "bg-well text-sage",
  clay: "bg-clay-wash text-clay",
  rosewood: "bg-rosewood-wash text-rosewood",
  plum: "bg-accent-wash text-accent",
  accent: "bg-accent-wash text-accent",
};

export function Pill({
  variant = "default",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] uppercase",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
