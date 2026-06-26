import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClasses =
  "w-full rounded border border-stone bg-surface px-3 py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-plum disabled:opacity-50";

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(fieldClasses, className)} {...props} />;
}
