import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClasses =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-50";

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(fieldClasses, className)} {...props} />;
}
