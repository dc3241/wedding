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
    <Card className={cn("px-6 py-5", className)}>
      <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
        {value}
      </div>
      <div className="mt-2 text-[14px] font-medium text-muted">{label}</div>
    </Card>
  );
}
