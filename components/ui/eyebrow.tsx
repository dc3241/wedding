import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  /** Show accent diamond ornament(s) — emotional surfaces only */
  diamond?: boolean;
  /** Show hairline rules flanking the label — emotional surfaces only */
  rules?: boolean;
};

function Diamond({ className }: { className?: string }) {
  return (
    <span
      className={cn("size-[5px] shrink-0 rotate-45 bg-accent", className)}
      aria-hidden
    />
  );
}

export function Eyebrow({
  className,
  diamond = false,
  rules = false,
  children,
  ...props
}: EyebrowProps) {
  const emotional = diamond || rules;

  if (!emotional) {
    return (
      <span
        className={cn(
          "text-[12px] font-semibold uppercase tracking-[0.09em] text-accent",
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "text-eyebrow-emotional inline-flex items-center gap-3",
        className,
      )}
      {...props}
    >
      {rules ? (
        <span className="h-px w-10 shrink-0 bg-hairline sm:w-14" aria-hidden />
      ) : null}
      {diamond ? <Diamond /> : null}
      <span className="shrink-0">{children}</span>
      {diamond ? <Diamond /> : null}
      {rules ? (
        <span className="h-px w-10 shrink-0 bg-hairline sm:w-14" aria-hidden />
      ) : null}
    </span>
  );
}
