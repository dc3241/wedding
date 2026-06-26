import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const fieldClasses =
  "w-full rounded border border-stone bg-surface px-3 py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-plum disabled:opacity-50";

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}
