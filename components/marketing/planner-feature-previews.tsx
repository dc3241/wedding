import { LEAD_STAGE_LABEL, LEAD_STAGES } from "@/components/leads/types";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Recessed well already used by FeatureGrid demos — raised card contains this, never another raised card. */
function PreviewWell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-[var(--radius-inner)] bg-well shadow-recessed",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="8" height="8" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 10l4 4 8-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** DASH-03: first letters of each name around & / and. */
function MiniAvatar({ initials }: { initials: string }) {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-pill)] bg-surface text-[11px] font-semibold tracking-[0.02em] text-muted">
      {initials}
    </div>
  );
}

function MiniWeddingRow({
  initials,
  name,
  date,
  donePct,
  overduePct,
}: {
  initials: string;
  name: string;
  date: string;
  donePct: number;
  overduePct: number;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <MiniAvatar initials={initials} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
          {name}
        </p>
        <p className="mt-0.5 text-[12px] font-medium text-muted">{date}</p>
        <div
          className="mt-1.5 flex h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-surface shadow-recessed"
          role="presentation"
        >
          <div className="h-full bg-sage" style={{ width: `${donePct}%` }} />
          <div
            className="h-full bg-rosewood"
            style={{ width: `${overduePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Card 1 — miniature DASH-03 wedding rows. Sage = done, rosewood = overdue. */
export function WeddingsPreview() {
  return (
    <PreviewWell className="flex flex-col gap-3 p-3.5">
      <MiniWeddingRow
        initials="EJ"
        name="Elena & Jonah"
        date="Jun 14, 2027"
        donePct={58}
        overduePct={14}
      />
      <MiniWeddingRow
        initials="NC"
        name="Nadia & Chris"
        date="Sep 6, 2027"
        donePct={36}
        overduePct={22}
      />
    </PreviewWell>
  );
}

const PIPELINE_PREVIEW_STAGES = LEAD_STAGES.slice(0, 3);

/** Card 2 — first three kanban stages in order. Last chip is the only berry accent. */
export function PipelinePreview() {
  const lastIndex = PIPELINE_PREVIEW_STAGES.length - 1;

  return (
    <PreviewWell className="p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE_PREVIEW_STAGES.map((stage, index) => {
          const label = LEAD_STAGE_LABEL[stage];
          const active = index === lastIndex;
          return (
            <span
              key={stage}
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-surface px-2.5 py-1 text-[11px] font-semibold",
                active
                  ? "border border-accent text-ink"
                  : "text-sage",
              )}
            >
              {active ? null : (
                <span
                  className="flex size-3.5 items-center justify-center rounded-[var(--radius-pill)] bg-sage text-surface"
                  aria-hidden
                >
                  <CheckGlyph />
                </span>
              )}
              {label}
            </span>
          );
        })}
      </div>
    </PreviewWell>
  );
}

/** Card 3 — Access role labels + Team (TEAM-01 sidebar / page title). */
export function TeamPreview() {
  return (
    <PreviewWell className="p-3.5">
      <div className="flex">
        {["EJ", "MK", "AL"].map((initials, index) => (
          <div
            key={initials}
            className={cn(index > 0 && "-ml-2")}
            style={{ zIndex: 3 - index }}
          >
            <div className="grid size-8 place-items-center rounded-[var(--radius-pill)] bg-surface text-[12px] font-semibold tracking-[0.02em] text-ink ring-2 ring-well">
              {initials}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] text-accent uppercase">
          Couple
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] bg-surface px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] text-muted uppercase">
          Collaborator
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] bg-surface px-2.5 py-1 text-[11px] font-bold tracking-[0.03em] text-muted uppercase">
          Team
        </span>
      </div>
    </PreviewWell>
  );
}

/** Card 4 — contrast row vs LEAD-STALE-01 rosewood copy. */
export function StalePreview() {
  return (
    <PreviewWell className="px-3.5 py-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-2.5">
        <span className="min-w-0 truncate text-[13px] font-medium text-ink">
          Hannah & Luis
        </span>
        <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[var(--radius-pill)] bg-clay-wash px-2.5 py-1 text-[11px] font-bold text-clay">
          Updated 2d ago
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
        <span className="min-w-0 truncate text-[13px] font-medium text-ink">
          Asha & Ben
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] bg-rosewood-wash px-2.5 py-1 text-[11px] font-bold text-rosewood">
          <span
            className="size-1.5 shrink-0 rounded-full bg-rosewood"
            aria-hidden
          />
          No activity in 16d
        </span>
      </div>
    </PreviewWell>
  );
}
