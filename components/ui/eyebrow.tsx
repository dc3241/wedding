import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type EyebrowProps = HTMLAttributes<HTMLSpanElement>;

export function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium tracking-[0.06em] text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
