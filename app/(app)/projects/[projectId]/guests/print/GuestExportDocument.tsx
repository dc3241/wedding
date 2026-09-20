"use client";

import Link from "next/link";
import type { CatererMealTally } from "@/lib/caterer-tally";
import {
  buildGuestListCsv,
  buildMailingCsv,
  downloadCsv,
  guestExportFilename,
  type GuestListCsvRow,
} from "@/lib/guest-exports/csv";
import { exportFilenameSlug } from "@/lib/guest-exports/format";
import {
  guestListFooter,
  mailingAddressGap,
  type MailingHousehold,
} from "@/lib/guest-exports/mailing";
import { Button } from "@/components/ui/button";
import { formatWeddingDate } from "@/components/website/template-utils";
import { cn } from "@/lib/cn";

export type GuestExportJob = "mailing" | "people";

type GuestExportDocumentProps = {
  projectId: string;
  coupleNames: string;
  weddingDate: string | null;
  job: GuestExportJob;
  mailing: MailingHousehold[];
  people: GuestListCsvRow[];
  tally: CatererMealTally[];
};

function jobSubtitle(job: GuestExportJob) {
  return job === "mailing" ? "Mailing list" : "Guest list";
}

export function GuestExportDocument({
  projectId,
  coupleNames,
  weddingDate,
  job,
  mailing,
  people,
  tally,
}: GuestExportDocumentProps) {
  const dateLabel = weddingDate ? formatWeddingDate(weddingDate) : null;
  const basePath = `/projects/${projectId}/guests/print`;
  const gap = mailingAddressGap(mailing);
  const footer = guestListFooter(people.length, tally);

  function onDownload() {
    if (job === "mailing") {
      downloadCsv(
        guestExportFilename("mailing", coupleNames, exportFilenameSlug),
        buildMailingCsv(mailing),
      );
      return;
    }
    downloadCsv(
      guestExportFilename("guests", coupleNames, exportFilenameSlug),
      buildGuestListCsv(people),
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .guest-export-print-root,
          .guest-export-print-root * {
            visibility: visible;
          }
          .guest-export-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
          }
          .guest-export-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="guest-export-no-print mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/projects/${projectId}/guests`}
            className="text-[13px] text-muted no-underline hover:text-ink"
          >
            ← Back to guests
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

        <nav
          className="flex flex-wrap gap-2"
          aria-label="Export job"
        >
          <JobLink href={basePath} active={job === "mailing"}>
            Mailing
          </JobLink>
          <JobLink href={`${basePath}?job=people`} active={job === "people"}>
            Guest list
          </JobLink>
        </nav>

        {job === "mailing" && gap.total > 0 && gap.missing > 0 ? (
          <p className="text-[13px] font-medium text-clay">
            {gap.missing} of {gap.total}{" "}
            {gap.total === 1 ? "household has" : "households have"} no mailing
            address.
          </p>
        ) : null}
      </div>

      <article className="guest-export-print-root mx-auto max-w-[880px] rounded-[var(--radius-card)] border border-hairline bg-surface px-8 py-10 sm:px-10 sm:py-12">
        <header className="border-b border-hairline pb-8 text-center">
          <h1 className="font-serif-display text-[clamp(28px,4vw,36px)] leading-tight text-ink">
            {coupleNames}
          </h1>
          <div className="mt-3 space-y-1 text-[14px] text-muted">
            {dateLabel ? <p>{dateLabel}</p> : null}
            <p className="pt-2 text-[13px] font-medium uppercase tracking-[0.12em] text-ink">
              {jobSubtitle(job)}
            </p>
          </div>
        </header>

        <div className="py-8">
          {job === "mailing" ? (
            <MailingTable rows={mailing} missing={gap.missing} total={gap.total} />
          ) : (
            <PeopleTable rows={people} tally={tally} />
          )}
        </div>

        <footer className="border-t border-hairline pt-5 text-center text-[13px] tabular-nums text-muted">
          {job === "mailing"
            ? `${mailing.length} ${mailing.length === 1 ? "household" : "households"}`
            : footer.tallyLabel
              ? `${footer.peopleLabel} · ${footer.tallyLabel}`
              : footer.peopleLabel}
        </footer>
      </article>
    </>
  );
}

function JobLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[var(--radius-pill)] px-3.5 py-2 text-[13px] font-semibold no-underline transition-colors",
        active ? "bg-accent text-surface" : "bg-well text-muted hover:text-ink",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function MailingTable({
  rows,
  missing,
  total,
}: {
  rows: MailingHousehold[];
  missing: number;
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[15px] text-muted">
        No households on the guest list yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {missing > 0 ? (
        <p className="text-[13px] text-muted">
          {missing} of {total}{" "}
          {total === 1 ? "household has" : "households have"} no mailing
          address.
        </p>
      ) : null}
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-hairline text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            <th className="py-2 pr-3 font-semibold">Envelope</th>
            <th className="py-2 pr-3 font-semibold">People</th>
            <th className="py-2 pr-3 font-semibold">Address</th>
            <th className="py-2 pr-3 font-semibold">Phone</th>
            <th className="py-2 pr-3 font-semibold">RSVP</th>
            <th className="py-2 font-semibold tabular-nums">Size</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.guestId} className="border-b border-hairline align-top">
              <td className="py-2.5 pr-3 font-medium text-ink">
                {row.envelopeName}
              </td>
              <td className="py-2.5 pr-3 text-ink">{row.people || "—"}</td>
              <td className="py-2.5 pr-3 text-ink">
                {row.address || (
                  <span className="text-muted">No address</span>
                )}
              </td>
              <td className="py-2.5 pr-3 text-ink">{row.phone || "—"}</td>
              <td className="py-2.5 pr-3 text-ink">{row.rsvp}</td>
              <td className="py-2.5 tabular-nums text-ink">{row.partySize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeopleTable({
  rows,
  tally,
}: {
  rows: GuestListCsvRow[];
  tally: CatererMealTally[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[15px] text-muted">
        No people on the guest list yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {tally.length > 0 ? (
        <section>
          <h2 className="border-b border-hairline pb-2 text-[13px] font-medium uppercase tracking-[0.12em] text-muted">
            Meal tally
          </h2>
          <ul className="mt-3 divide-y divide-hairline">
            {tally.map((row) => (
              <li
                key={row.meal_option_id ?? "none"}
                className="flex items-baseline justify-between gap-3 py-2 text-[15px]"
              >
                <span className="text-ink">{row.label}</span>
                <span className="tabular-nums font-medium text-ink">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-hairline text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            <th className="py-2 pr-3 font-semibold">Name</th>
            <th className="py-2 pr-3 font-semibold">Household</th>
            <th className="py-2 pr-3 font-semibold">RSVP</th>
            <th className="py-2 pr-3 font-semibold">Meal</th>
            <th className="py-2 pr-3 font-semibold">Dietary</th>
            <th className="py-2 font-semibold">Relationship</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.name}-${row.household}-${index}`}
              className="border-b border-hairline align-top"
            >
              <td className="py-2.5 pr-3 font-medium text-ink">{row.name}</td>
              <td className="py-2.5 pr-3 text-ink">{row.household}</td>
              <td className="py-2.5 pr-3 text-ink">{row.rsvp}</td>
              <td className="py-2.5 pr-3 text-ink">{row.meal || "—"}</td>
              <td className="py-2.5 pr-3 text-ink">{row.dietary || "—"}</td>
              <td className="py-2.5 text-ink">{row.relationship || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
