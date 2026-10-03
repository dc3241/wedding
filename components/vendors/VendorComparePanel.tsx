"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GoogleMapsAttribution } from "@/components/vendors/GoogleMapsAttribution";
import { GooglePlaceRating } from "@/components/vendors/GooglePlaceRating";
import { VendorStatusPill } from "@/components/vendors/vendor-status";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/format-currency";
import type {
  VendorComparison,
  VendorComparisonColumn,
} from "@/lib/vendors/vendor-comparison";

const TITLE_ID = "vendor-compare-title";

function EmptyValue() {
  return (
    <span className="text-muted">
      <span aria-hidden>—</span>
      <span className="sr-only">Not available</span>
    </span>
  );
}

function websiteLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function QuoteCell({ amount }: { amount: number | null }) {
  if (amount == null) return <EmptyValue />;
  return <span className="tabnum font-medium text-ink">{formatCurrency(amount)}</span>;
}

function SitePriceCell({
  price,
}: {
  price: VendorComparisonColumn["sitePrice"];
}) {
  if (!price) return <EmptyValue />;
  return (
    <p className="text-ink">
      <span className="tabnum font-medium">
        {formatCurrency(price.startingAmount)}
      </span>
      {price.perPerson ? (
        <span className="text-[13px] text-muted"> per person</span>
      ) : null}
    </p>
  );
}

function RatingCell({ column }: { column: VendorComparisonColumn }) {
  if (column.rating == null) return <EmptyValue />;
  return (
    <div className="space-y-1">
      <GooglePlaceRating
        rating={column.rating}
        userRatingCount={column.userRatingCount}
        className="text-[13px]"
      />
      {column.googleMapsUri ? (
        <a
          href={column.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-accent hover:opacity-80"
        >
          View on <span translate="no">Google Maps</span>
        </a>
      ) : null}
    </div>
  );
}

function WebsiteCell({ column }: { column: VendorComparisonColumn }) {
  if (!column.website && !column.area) return <EmptyValue />;
  return (
    <div className="space-y-1">
      {column.website ? (
        <a
          href={column.website}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-[13px] font-medium text-accent hover:opacity-80"
        >
          {websiteLabel(column.website)}
        </a>
      ) : null}
      {column.area ? (
        <p className="text-[13px] text-muted">{column.area}</p>
      ) : null}
    </div>
  );
}

function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <EmptyValue />;
  return (
    <p className="line-clamp-3 text-[13px] text-ink" title={notes}>
      {notes}
    </p>
  );
}

function OverviewCell({ overview }: { overview: string | null }) {
  if (!overview) return <EmptyValue />;
  return (
    <p className="line-clamp-4 text-[13px] leading-relaxed text-ink" title={overview}>
      {overview}
    </p>
  );
}

const ROWS: {
  id: string;
  label: string;
  cell: (column: VendorComparisonColumn) => ReactNode;
}[] = [
  {
    id: "status",
    label: "Status",
    cell: (column) => <VendorStatusPill status={column.status} />,
  },
  {
    id: "quote",
    label: "Quote for this wedding",
    cell: (column) => <QuoteCell amount={column.quotedPrice} />,
  },
  {
    id: "site",
    label: "Starting price on their site",
    cell: (column) => <SitePriceCell price={column.sitePrice} />,
  },
  {
    id: "rating",
    label: "Rating",
    cell: (column) => <RatingCell column={column} />,
  },
  {
    id: "website",
    label: "Website and area",
    cell: (column) => <WebsiteCell column={column} />,
  },
  {
    id: "notes",
    label: "Your notes",
    cell: (column) => <NotesCell notes={column.notes} />,
  },
  {
    id: "overview",
    label: "Overview",
    cell: (column) => <OverviewCell overview={column.overview} />,
  },
];

export function VendorComparePanel({
  projectId,
  comparison,
  onClose,
}: {
  projectId: string;
  comparison: VendorComparison;
  onClose: () => void;
}) {
  const columnCount = comparison.columns.length;
  const gridStyle = {
    gridTemplateColumns: `minmax(7.5rem, 10.5rem) repeat(${columnCount}, minmax(0, 1fr))`,
  };

  return (
    <Modal
      onClose={onClose}
      labelledBy={TITLE_ID}
      panelClassName="max-w-5xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>{comparison.categoryLabel}</Eyebrow>
          <h2
            id={TITLE_ID}
            className="mt-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink"
          >
            Compare
          </h2>
        </div>
        <Button type="button" variant="default" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-5 space-y-3 md:hidden">
        {comparison.columns.map((column) => (
          <article
            key={column.projectVendorId}
            className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed"
          >
            <Link
              href={`/projects/${projectId}/vendors/${column.vendorId}`}
              className="text-[15px] font-medium text-ink hover:text-accent"
            >
              {column.name}
            </Link>
            <dl className="mt-3 space-y-3">
              {ROWS.map((row) => (
                <div key={row.id}>
                  <dt className="text-[13px] text-muted">{row.label}</dt>
                  <dd className="mt-1 min-w-0">{row.cell(column)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="mt-5 hidden space-y-2 md:block" role="table">
        <div
          role="row"
          className="grid items-end gap-3 px-3"
          style={gridStyle}
        >
          <div role="columnheader" />
          {comparison.columns.map((column) => (
            <div key={column.projectVendorId} role="columnheader" className="min-w-0">
              <Link
                href={`/projects/${projectId}/vendors/${column.vendorId}`}
                className="line-clamp-2 text-[15px] font-medium text-ink hover:text-accent"
              >
                {column.name}
              </Link>
            </div>
          ))}
        </div>
        {ROWS.map((row) => (
          <div
            key={row.id}
            role="row"
            className="grid items-start gap-3 rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed"
            style={gridStyle}
          >
            <div
              role="rowheader"
              className="pt-0.5 text-[13px] font-medium text-muted"
            >
              {row.label}
            </div>
            {comparison.columns.map((column) => (
              <div key={column.projectVendorId} role="cell" className="min-w-0">
                {row.cell(column)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {comparison.showGoogleAttribution ? (
        <div className="mt-4 flex justify-end">
          <GoogleMapsAttribution />
        </div>
      ) : null}
    </Modal>
  );
}
