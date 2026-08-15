import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import type { CSSProperties, ReactNode } from "react";

const WORKSPACE_ROWS = [
  { label: "Wedding website", meta: "Live" },
  { label: "Guest list & seating", meta: "142 invited" },
  { label: "Shared budget", meta: "On track" },
] as const;

function ElmIvyMark() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-accent text-[9px] font-extrabold tracking-tight text-surface">
        E&I
      </span>
      <span className="truncate text-[13px] font-extrabold tracking-[-0.02em] text-ink">
        Elm &amp; Ivy Events
      </span>
    </div>
  );
}

function MiniWorkspace({ brand }: { brand: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">
        {brand}
        <span className="shrink-0 text-[11px] font-semibold text-accent">
          Overview
        </span>
      </div>
      <div className="space-y-px p-2">
        {WORKSPACE_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 px-2 py-2"
          >
            <span className="text-[13px] font-medium text-ink">{row.label}</span>
            <span className="text-[12px] text-muted">{row.meta}</span>
          </div>
        ))}
        <div className="px-2 pt-1 pb-2">
          <Pill variant="accent">RSVP open</Pill>
        </div>
      </div>
    </div>
  );
}

const ELM_IVY_ACCENT = {
  "--accent": "var(--sage)",
  "--accent-wash": "var(--sage-wash)",
} as CSSProperties;

export function WhiteLabelShowcase({
  extra,
  className,
  eyebrow = "Your brand, not ours",
  title = "Your clients never see First Look",
  subhead = "Turn on white-label and everything your clients see — their wedding site, their workspace — carries your logo and colors, automatically. Venue accounts can extend that branding across their whole team's workspace too.",
}: {
  extra?: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  subhead?: string;
} = {}) {
  return (
    <div className={cn(className)}>
      <div className="mx-auto mb-9 max-w-[52ch] text-center">
        <Eyebrow className="mb-4 block">{eyebrow}</Eyebrow>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
          {title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
          {subhead}
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised md:p-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-0">
          <div className="md:pr-6">
            <p className="mb-3 text-[13px] font-semibold text-muted">
              Default branding
            </p>
            <MiniWorkspace
              brand={<Wordmark className="h-5 w-auto text-ink" />}
            />
          </div>
          <div
            className="border-t border-hairline pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6"
            style={ELM_IVY_ACCENT}
          >
            <p className="mb-3 text-[13px] font-semibold text-muted">
              Your branding
            </p>
            <MiniWorkspace brand={<ElmIvyMark />} />
          </div>
        </div>
      </div>

      {extra ? (
        <p className="mx-auto mt-6 max-w-[48ch] text-center text-[14px] leading-relaxed text-muted md:text-[15px]">
          {extra}
        </p>
      ) : null}
    </div>
  );
}
