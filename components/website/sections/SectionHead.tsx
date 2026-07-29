import type { ReactNode } from "react";
import type { SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

function BotanicalSprig({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 24"
      width="46"
      height="24"
      fill="none"
      aria-hidden
    >
      <path
        d="M32 12 C28 8, 22 6, 16 9 C13 11, 12 14, 14 17"
        stroke="var(--ws-accent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.75}
      />
      <path
        d="M32 12 C36 8, 42 6, 48 9 C51 11, 52 14, 50 17"
        stroke="var(--ws-accent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.75}
      />
      <path
        d="M32 12 L32 20"
        stroke="var(--ws-accent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.75}
      />
      <circle cx="32" cy="12" r="1.5" fill="var(--ws-accent)" fillOpacity="0.7" />
    </svg>
  );
}

type SectionHeadProps = {
  variant: SectionVariant;
  eyebrow?: string;
  children: ReactNode;
  sub?: string;
  className?: string;
};

export function SectionHead({
  variant,
  eyebrow,
  children,
  sub,
  className,
}: SectionHeadProps) {
  if (variant === "editorial") {
    return (
      <div
        className={cn(
          "mb-[52px] flex flex-wrap items-baseline justify-between gap-4 border-b pb-4 text-left",
          className,
        )}
        style={{ borderColor: "var(--ws-border)" }}
      >
        <h2
          className="font-serif-display m-0 text-[clamp(30px,5vw,46px)] font-medium"
          style={{ color: "var(--ws-ink)" }}
        >
          {children}
        </h2>
        {sub ? (
          <p className="m-0 max-w-[340px] text-[15px]" style={{ color: "var(--ws-muted)" }}>
            {sub}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === "minimalist") {
    return (
      <div className={cn("mb-[52px] text-center", className)}>
        <h2
          className="m-0 text-[clamp(16px,3vw,22px)] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--ws-ink)" }}
        >
          {children}
        </h2>
        {sub ? (
          <p className="mx-auto mt-3.5 max-w-[520px] text-[15px]" style={{ color: "var(--ws-muted)" }}>
            {sub}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === "romance") {
    return (
      <div className={cn("mb-[52px] text-center", className)}>
        {eyebrow ? (
          <p
            className="m-0 mb-3.5 text-[12px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--ws-accent)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className="font-serif-display m-0 text-[clamp(30px,5vw,46px)] font-medium italic"
          style={{ color: "var(--ws-ink)" }}
        >
          {children}
        </h2>
        {sub ? (
          <p className="mx-auto mt-3.5 max-w-[520px] text-[15px]" style={{ color: "var(--ws-muted)" }}>
            {sub}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === "garden") {
    return (
      <div className={cn("mb-[52px] text-center", className)}>
        <BotanicalSprig className="mx-auto mb-3.5" />
        {eyebrow ? (
          <p
            className="m-0 mb-3.5 text-[12px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: "var(--ws-accent)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className="font-serif-display m-0 text-[clamp(30px,5vw,46px)] font-medium"
          style={{ color: "var(--ws-ink)" }}
        >
          {children}
        </h2>
        {sub ? (
          <p className="mx-auto mt-3.5 max-w-[520px] text-[15px]" style={{ color: "var(--ws-muted)" }}>
            {sub}
          </p>
        ) : null}
      </div>
    );
  }

  // classic
  return (
    <div className={cn("mb-[52px] text-center", className)}>
      {eyebrow ? (
        <p
          className="m-0 mb-3.5 text-[12px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: "var(--ws-accent)" }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="font-serif-display m-0 text-[clamp(30px,5vw,46px)] font-medium"
        style={{ color: "var(--ws-ink)" }}
      >
        {children}
      </h2>
      {sub ? (
        <p className="mx-auto mt-3.5 max-w-[520px] text-[15px]" style={{ color: "var(--ws-muted)" }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}
