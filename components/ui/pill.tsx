import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export type PillVariant = "default" | "sage" | "clay" | "rosewood" | "plum";

type PillProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: PillVariant;
};

const variantClasses: Record<PillVariant, string> = {
  default: "border-stone bg-surface text-ink-muted",
  sage: "border-stone bg-surface text-sage",
  clay: "border-stone bg-surface text-clay",
  rosewood: "border-stone bg-surface text-rosewood",
  plum: "border-transparent bg-plum-tint text-plum",
};

const dotClasses: Record<PillVariant, string> = {
  default: "bg-ink-muted",
  sage: "bg-sage",
  clay: "bg-clay",
  rosewood: "bg-rosewood",
  plum: "bg-plum",
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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dotClasses[variant])}
        aria-hidden
      />
      {children}
    </span>
  );
}
