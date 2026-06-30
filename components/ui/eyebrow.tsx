import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type EyebrowProps = HTMLAttributes<HTMLSpanElement>;

export function Eyebrow({ className, ...props }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-[11.5px] font-medium uppercase tracking-[0.15em] text-plum",
        className,
      )}
      {...props}
    />
  );
}
