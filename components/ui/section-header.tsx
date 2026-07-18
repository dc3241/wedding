import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function SectionHeader({ children, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-center gap-3.5", className)}>
      <Eyebrow className="mb-0 shrink-0">{children}</Eyebrow>
      <div className="h-px flex-1 bg-hairline" aria-hidden />
    </div>
  );
}
