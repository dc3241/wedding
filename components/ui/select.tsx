import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const fieldClasses =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink outline-none transition-colors focus:border-accent disabled:opacity-50";

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn(fieldClasses, className)} {...props} />;
}
