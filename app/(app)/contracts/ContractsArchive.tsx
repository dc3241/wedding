"use client";

import { useMemo, useState, useTransition } from "react";
import { getDownloadUrl } from "@/components/files/actions";
import { formatUploadedDate } from "@/components/files/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";
import type { ArchiveContract, ArchiveWedding } from "./types";

type ContractStatus = "draft" | "sent" | "signed";

const UNCATEGORIZED = "__uncategorized__";

function normalizeStatus(status: string | null): ContractStatus {
  if (status === "sent" || status === "signed") return status;
  return "draft";
}

const STATUS_PILL: Record<
  ContractStatus,
  { label: string; variant: "default" | "clay" | "sage" }
> = {
  draft: { label: "Draft", variant: "default" },
  sent: { label: "Sent", variant: "clay" },
  signed: { label: "Signed", variant: "sage" },
};

/** Local calendar date key (YYYY-MM-DD) from a timestamptz ISO string. */
function createdDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ContractDownloadButton({ fileId }: { fileId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getDownloadUrl(fileId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="default"
        onClick={handleDownload}
        disabled={isPending}
        className="px-3 py-1.5 text-[13px]"
      >
        {isPending ? "Opening…" : "Download"}
      </Button>
      {error ? (
        <p className="max-w-[160px] text-right text-[11px] text-rosewood">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContractsArchive({
  contracts,
  weddings,
}: {
  contracts: ArchiveContract[];
  weddings: ArchiveWedding[];
}) {
  const [weddingId, setWeddingId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categoryOptions = useMemo(() => {
    const ids = new Set<string>();
    let hasUncategorized = false;
    for (const row of contracts) {
      if (row.category) ids.add(row.category);
      else hasUncategorized = true;
    }
    const sorted = [...ids].sort((a, b) =>
      vendorCategoryLabel(a).localeCompare(vendorCategoryLabel(b), undefined, {
        sensitivity: "base",
      }),
    );
    return { sorted, hasUncategorized };
  }, [contracts]);

  const filtered = useMemo(() => {
    return contracts.filter((row) => {
      if (weddingId && row.project_id !== weddingId) return false;
      const key = createdDateKey(row.created_at);
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      if (categoryFilter === UNCATEGORIZED) {
        if (row.category) return false;
      } else if (categoryFilter && row.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [contracts, weddingId, dateFrom, dateTo, categoryFilter]);

  const hasFilters = Boolean(
    weddingId || dateFrom || dateTo || categoryFilter,
  );

  if (contracts.length === 0) {
    return (
      <EmptyState>
        No contracts yet. Upload agreements from a wedding&apos;s Contracts tab.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Wedding</span>
            <Select
              value={weddingId}
              onChange={(e) => setWeddingId(e.target.value)}
              aria-label="Filter by wedding"
            >
              <option value="">All weddings</option>
              {weddings.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.archived_at ? " (archived)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Category</span>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categoryOptions.sorted.map((id) => (
                <option key={id} value={id}>
                  {vendorCategoryLabel(id)}
                </option>
              ))}
              {categoryOptions.hasUncategorized ? (
                <option value={UNCATEGORIZED}>Uncategorized</option>
              ) : null}
            </Select>
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">From</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter from date"
            />
          </label>
          <label className="flex min-w-[140px] flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">To</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
            />
          </label>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2.5 text-[13px]"
              onClick={() => {
                setWeddingId("");
                setDateFrom("");
                setDateTo("");
                setCategoryFilter("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState>
          No contracts match these filters.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hidden border-b border-hairline px-5 py-3 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto_auto] md:gap-4">
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Contract
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Wedding
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Category
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Date
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
              Status
            </span>
            <span className="sr-only">Download</span>
          </div>
          <ul className="list-none p-3 sm:p-4">
            {filtered.map((row) => {
              const status = normalizeStatus(row.status);
              const chip = STATUS_PILL[status];
              const categoryLabel = row.category
                ? vendorCategoryLabel(row.category)
                : "Uncategorized";
              return (
                <li
                  key={row.id}
                  className={cn(
                    "mb-2 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
                    "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto_auto] md:items-center md:gap-4",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-ink">
                      {row.name}
                    </p>
                    <p className="mt-1 text-[13px] text-muted md:hidden">
                      {row.project_name}
                      <span className="mx-1.5">·</span>
                      {categoryLabel}
                      <span className="mx-1.5">·</span>
                      <span className="tabular-nums">
                        {formatUploadedDate(row.created_at)}
                      </span>
                    </p>
                  </div>
                  <p className="hidden truncate text-[14px] font-medium text-ink md:block">
                    {row.project_name}
                  </p>
                  <p className="hidden truncate text-[14px] text-muted md:block">
                    {categoryLabel}
                  </p>
                  <p className="hidden text-[14px] tabular-nums text-muted md:block">
                    {formatUploadedDate(row.created_at)}
                  </p>
                  <div className="mt-2 md:mt-0">
                    <Pill variant={chip.variant}>{chip.label}</Pill>
                  </div>
                  <div className="mt-3 md:mt-0 md:justify-self-end">
                    <ContractDownloadButton fileId={row.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
