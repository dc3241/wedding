import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const fieldClasses =
  "w-full rounded border border-stone bg-surface px-3 py-2 text-[15px] text-ink outline-none transition-colors focus:border-plum disabled:opacity-50";

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn(fieldClasses, className)} {...props} />;
}
