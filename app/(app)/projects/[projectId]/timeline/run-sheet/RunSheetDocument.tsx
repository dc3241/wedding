"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatWeddingDate } from "@/components/website/template-utils";
import {
  formatTimeRange,
  type TimelineAggregates,
  type TimelineSectionGroup,
} from "@/lib/timeline-aggregates";

export type RunSheetProjectMeta = {
  coupleNames: string;
  weddingDate: string | null;
  venue: string | null;
};

type RunSheetDocumentProps = {
  projectId: string;
  meta: RunSheetProjectMeta;
  ownerFilter: string | null;
  owners: string[];
  aggregates: TimelineAggregates;
};

function sheetSubtitle(ownerFilter: string | null) {
  if (!ownerFilter) return "All owners · run of show";
  return `${ownerFilter} · run of show`;
}

function RunSheetSections({ sections }: { sections: TimelineSectionGroup[] }) {
  if (sections.length === 0) {
    return (
      <p className="py-10 text-center text-[15px] text-ink-muted">
        No events for this vendor yet
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.key}>
          <h2 className="border-b border-stone pb-2 text-[13px] font-medium uppercase tracking-[0.12em] text-ink-muted">
            {section.label}
          </h2>
          <ul className="mt-3 divide-y divide-stone">
            {section.events.map((event) => (
              <li
                key={event.id}
                className="grid gap-2 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4"
              >
                <p className="text-[13px] font-medium tabular-nums text-ink">
                  {event.start_time
                    ? formatTimeRange(event.start_time, event.end_time)
                    : "Unscheduled"}
                </p>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{event.title}</p>
                  {event.description?.trim() ? (
                    <p className="mt-1 text-[13px] leading-snug text-ink-muted">
                      {event.description.trim()}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function RunSheetDocument({
  projectId,
  meta,
  ownerFilter,
  owners,
  aggregates,
}: RunSheetDocumentProps) {
  const router = useRouter();
  const dateLabel = meta.weddingDate
    ? formatWeddingDate(meta.weddingDate)
    : null;
  const basePath = `/projects/${projectId}/timeline/run-sheet`;

  function onOwnerChange(value: string) {
    if (!value || value === "all") {
      router.push(basePath);
      return;
    }
    router.push(`${basePath}?owner=${encodeURIComponent(value)}`);
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .run-sheet-print-root,
          .run-sheet-print-root * {
            visibility: visible;
          }
          .run-sheet-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
          }
          .run-sheet-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="run-sheet-no-print mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/projects/${projectId}/timeline`}
            className="text-[13px] text-ink-muted no-underline hover:text-ink"
          >
            ← Back to timeline
          </Link>
          <Button
            type="button"
            variant="primary"
            onClick={() => window.print()}
          >
            Print / save as PDF
          </Button>
        </div>

        <label className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          <span>Owner</span>
          <select
            value={ownerFilter ?? "all"}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="rounded border border-stone bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum"
          >
            <option value="all">All owners</option>
            {ownerFilter && !owners.includes(ownerFilter) ? (
              <option value={ownerFilter}>{ownerFilter}</option>
            ) : null}
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
      </div>

      <article className="run-sheet-print-root mx-auto max-w-[720px] rounded-lg border border-stone bg-surface px-8 py-10 sm:px-10 sm:py-12">
        <header className="border-b border-stone pb-8 text-center">
          <h1 className="font-serif-display text-[clamp(28px,4vw,36px)] leading-tight text-ink">
            {meta.coupleNames}
          </h1>
          <div className="mt-3 space-y-1 text-[14px] text-ink-muted">
            {dateLabel ? <p>{dateLabel}</p> : null}
            {meta.venue ? <p>{meta.venue}</p> : null}
            <p className="pt-2 text-[13px] font-medium uppercase tracking-[0.12em] text-ink">
              {sheetSubtitle(ownerFilter)}
            </p>
          </div>
        </header>

        <div className="py-8">
          <RunSheetSections sections={aggregates.sections} />
        </div>

        <footer className="border-t border-stone pt-5 text-center text-[13px] tabular-nums text-ink-muted">
          {aggregates.total}{" "}
          {aggregates.total === 1 ? "event" : "events"}
          {aggregates.daySpanLabel ? ` · ${aggregates.daySpanLabel}` : null}
        </footer>
      </article>
    </>
  );
}
