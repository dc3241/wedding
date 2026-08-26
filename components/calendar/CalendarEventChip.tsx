import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CalendarChipStatus = "overdue" | "done";

type CalendarEventChipProps = {
  title: string;
  glyph: string;
  /** CSS custom-property name, e.g. `--cal-w-1`. */
  hueVar: string;
  timeLabel?: string | null;
  status?: CalendarChipStatus;
  onClick?: () => void;
  className?: string;
};

/**
 * Soft-stack calendar cell chip (CAL-03 / CAL-05).
 * Tint = identity/kind via `--hue`; status colour only on the dot / done glyph.
 * Title sits on its own row (full chip width), wraps at word boundaries, clamps
 * to two lines; `title` exposes the full string on hover / long-press.
 */
export function CalendarEventChip({
  title,
  glyph,
  hueVar,
  timeLabel,
  status,
  onClick,
  className,
}: CalendarEventChipProps) {
  const overdue = status === "overdue";
  const done = status === "done";

  const style = {
    ["--hue" as string]: `var(${hueVar})`,
    background: "color-mix(in srgb, var(--hue) 20%, white)",
  } as CSSProperties;

  const body: ReactNode = (
    <>
      <span className="flex min-w-0 items-center gap-1">
        {overdue ? (
          <span
            className="size-1.5 shrink-0 rounded-full bg-rosewood"
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "shrink-0 text-[10px] opacity-85",
            done && "text-sage opacity-100",
          )}
          aria-hidden
        >
          {glyph}
        </span>
        {timeLabel ? (
          <span className="min-w-0 font-semibold tabular-nums">{timeLabel}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "min-w-0 font-medium hyphens-none [overflow-wrap:break-word] [word-break:normal] line-clamp-2",
          done && "line-through decoration-sage/60",
        )}
      >
        {title}
      </span>
    </>
  );

  const chipClass = cn(
    "flex w-full min-w-0 flex-col items-stretch gap-0 overflow-hidden border-l-[2.5px] border-l-[var(--hue)] py-0.5 pr-1.5 pl-1 text-left text-[11px] leading-snug text-ink",
    "rounded-[var(--radius-inner)]",
    done && "opacity-[0.62]",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={chipClass}
        style={style}
        title={title}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={chipClass} style={style} title={title}>
      {body}
    </div>
  );
}
