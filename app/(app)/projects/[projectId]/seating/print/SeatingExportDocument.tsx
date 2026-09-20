"use client";

import Link from "next/link";
import {
  buildTableAssignmentCsv,
  downloadCsv,
  guestExportFilename,
} from "@/lib/guest-exports/csv";
import { exportFilenameSlug } from "@/lib/guest-exports/format";
import {
  flattenTableAssignmentRows,
  type TableAssignmentExport,
} from "@/lib/guest-exports/tables";
import { Button } from "@/components/ui/button";
import { formatWeddingDate } from "@/components/website/template-utils";

type SeatingExportDocumentProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  data: TableAssignmentExport;
};

export function SeatingExportDocument({
  projectId,
  coupleNames,
  weddingDate,
  data,
}: SeatingExportDocumentProps) {
  const dateLabel = weddingDate ? formatWeddingDate(weddingDate) : null;
  const seatedCount = data.groups.reduce(
    (sum, group) => sum + group.people.length,
    0,
  );

  function onDownload() {
    downloadCsv(
      guestExportFilename("tables", coupleNames, exportFilenameSlug),
      buildTableAssignmentCsv(flattenTableAssignmentRows(data)),
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .seating-export-print-root,
          .seating-export-print-root * {
            visibility: visible;
          }
          .seating-export-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
          }
          .seating-export-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="seating-export-no-print mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/projects/${projectId}/seating`}
            className="text-[13px] text-muted no-underline hover:text-ink"
          >
            ← Back to seating
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="default" onClick={onDownload}>
              Download CSV
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.print()}
            >
              Print / save as PDF
            </Button>
          </div>
        </div>
      </div>

      <article className="seating-export-print-root mx-auto max-w-[880px] rounded-[var(--radius-card)] border border-hairline bg-surface px-8 py-10 sm:px-10 sm:py-12">
        <header className="border-b border-hairline pb-8 text-center">
          <h1 className="font-serif-display text-[clamp(28px,4vw,36px)] leading-tight text-ink">
            {coupleNames}
          </h1>
          <div className="mt-3 space-y-1 text-[14px] text-muted">
            {dateLabel ? <p>{dateLabel}</p> : null}
            <p className="pt-2 text-[13px] font-medium uppercase tracking-[0.12em] text-ink">
              Table assignments
            </p>
          </div>
        </header>

        <div className="space-y-8 py-8">
          {data.groups.length === 0 ? (
            <p className="py-6 text-center text-[15px] text-muted">
              No tables on the floor plan yet.
            </p>
          ) : (
            data.groups.map((group) => (
              <section key={group.tableId}>
                <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
                  <h2 className="text-[15px] font-semibold text-ink">
                    {group.tableLabel}
                  </h2>
                  <p className="text-[13px] tabular-nums text-muted">
                    {group.occupied} / {group.seatCount}
                  </p>
                </div>
                {group.people.length === 0 ? (
                  <p className="py-3 text-[13px] text-muted">No one seated</p>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {group.people.map((person) => (
                      <li
                        key={person.memberId}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2.5 text-[13px] sm:grid-cols-[4.5rem_minmax(0,1.2fr)_minmax(0,1fr)_6rem]"
                      >
                        <span className="tabular-nums text-muted">
                          {person.seat || "—"}
                        </span>
                        <span className="font-medium text-ink">
                          {person.name}
                          {person.declined ? (
                            <span className="ml-1.5 font-semibold text-rosewood">
                              declined
                            </span>
                          ) : null}
                        </span>
                        <span className="hidden text-ink sm:block">
                          {person.household}
                        </span>
                        <span className="hidden text-ink sm:block">
                          {person.rsvp}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))
          )}

          {data.unseated.length > 0 ? (
            <section>
              <h2 className="border-b border-hairline pb-2 text-[15px] font-semibold text-ink">
                Not seated
              </h2>
              <ul className="divide-y divide-hairline">
                {data.unseated.map((person) => (
                  <li
                    key={person.memberId}
                    className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]"
                  >
                    <span className="font-medium text-ink">
                      {person.name}
                      {person.declined ? (
                        <span className="ml-1.5 font-semibold text-rosewood">
                          declined
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted">{person.household}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <footer className="border-t border-hairline pt-5 text-center text-[13px] tabular-nums text-muted">
          {seatedCount} seated
          {data.unseated.length > 0
            ? ` · ${data.unseated.length} not seated`
            : null}
        </footer>
      </article>
    </>
  );
}
