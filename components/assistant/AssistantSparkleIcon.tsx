import { cn } from "@/lib/cn";

export function AssistantSparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    >
      <path
        fill="currentColor"
        d="M8 1.25l.85 3.4 3.4.85-3.4.85L8 9.75l-.85-3.4-3.4-.85 3.4-.85L8 1.25Z"
      />
      <path
        fill="currentColor"
        d="M12.5 2l.45 1.8 1.8.45-1.8.45-.45 1.8-.45-1.8-1.8-.45 1.8-.45.45-1.8Z"
      />
    </svg>
  );
}
