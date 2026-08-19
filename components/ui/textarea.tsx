import { cn } from "@/lib/cn";
import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClasses =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink transition-colors placeholder:text-muted disabled:opacity-50";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={cn(fieldClasses, className)} {...props} />
    );
  },
);
