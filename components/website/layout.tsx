import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const SITE_MAX_W = "1080px";
export const SITE_GUTTER = "clamp(20px, 5vw, 64px)";

/** Full-width section band — optional tint wash. */
export function Band({
  tint,
  children,
  className,
  id,
  style,
}: {
  tint?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-8", className)}
      style={{
        padding: `clamp(64px, 9vw, 110px) ${SITE_GUTTER}`,
        background: tint ? "var(--ws-tint)" : undefined,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Wrap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto w-full", className)}
      style={{ maxWidth: SITE_MAX_W }}
    >
      {children}
    </div>
  );
}
