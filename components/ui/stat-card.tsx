import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type StatCardProps = {
  value: ReactNode;
  label: string;
  className?: string;
};

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <Card className={cn("px-[26px] py-6", className)}>
      <div className="font-display tabnum text-[54px] leading-none tracking-[-0.01em] text-plum">
        {value}
      </div>
      <div className="mt-3 text-sm text-ink-muted">{label}</div>
    </Card>
  );
}
