import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  className?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  className,
  actions,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4",
        className,
      )}
    >
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1
          className={cn(
            "font-display text-[46px] leading-[1.02] tracking-[-0.01em] text-ink",
            eyebrow && "mt-1.5",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-base text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
