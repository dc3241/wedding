import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const fieldClasses =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink transition-colors placeholder:text-muted disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  },
);
