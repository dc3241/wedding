import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Shorter recessed control for dense rows. */
  compact?: boolean;
  /**
   * Hug the selected label. The default wrapper is full width, which collapses
   * sibling flex items (a checklist due date wraps one word per line).
   */
  fit?: boolean;
};

const fieldClasses =
  "peer w-full appearance-none rounded-[var(--radius-inner)] border font-medium text-ink transition-colors disabled:opacity-50";

function SelectChevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted peer-disabled:opacity-50"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function Select({
  className,
  compact = false,
  fit = false,
  ...props
}: SelectProps) {
  return (
    <span
      className={cn(
        "relative block min-w-0",
        fit ? "w-auto shrink-0" : "w-full",
      )}
    >
      <select
        className={cn(
          fieldClasses,
          compact
            ? "border-transparent bg-well py-1.5 pl-3 pr-8 text-[13px] shadow-recessed"
            : "border-ring bg-surface py-2.5 pl-3.5 pr-10 text-[15px]",
          fit && "!w-auto",
          className,
        )}
        {...props}
      />
      <SelectChevron />
    </span>
  );
}
