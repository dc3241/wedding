import { demoEntryPath } from "@/lib/demo/entry-path";
import type { DemoAccountKind } from "@/lib/demo/types";
import { cn } from "@/lib/cn";

export function DemoCta({
  kind,
  compact = false,
}: {
  kind: DemoAccountKind;
  /** Hero row: link only, no helper copy. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact ? "items-start" : "mt-5 items-center",
      )}
    >
      <a
        href={demoEntryPath(kind)}
        className={cn(
          "inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent",
          compact && "text-[15px] md:text-[16px]",
          "transition-opacity hover:opacity-80",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        See it with a live demo
        <span aria-hidden>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10h12M11 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
      {compact ? null : (
        <p className="max-w-[40ch] text-[13px] leading-relaxed text-muted">
          No signup required — explore a real workspace, then keep it if you like
          it.
        </p>
      )}
    </div>
  );
}
