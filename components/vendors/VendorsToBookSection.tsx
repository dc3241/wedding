"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import {
  ignoreVendorCategory,
  unignoreVendorCategory,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
import type { VendorCategoryId } from "@/lib/budget-vendor-category-map";

/** Still used by vendors/page.tsx for vendor_targets → Booked / Outreach / slots. */
export type VendorTargetRow = {
  id: string;
  category: string;
  note: string | null;
  status: "needed" | "booked" | "skipped";
  project_vendor_id: string | null;
};

export type ToBookCandidate = {
  categoryId: VendorCategoryId;
  label: string;
};

export type IgnoredVendorCategory = {
  categoryId: VendorCategoryId;
  label: string;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 14 14"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.25" />
      <path d="M9.25 9.25L12 12" strokeLinecap="round" />
    </svg>
  );
}

function ToBookCard({
  candidate,
  projectId,
}: {
  candidate: ToBookCandidate;
  projectId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const searchHref = `/projects/${projectId}/vendors?tab=search#discover`;

  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-medium text-ink">
          {candidate.label}
        </span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <ButtonLink href={searchHref} variant="secondary" className="gap-2">
            <SearchIcon />
            Find vendors
          </ButtonLink>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            className="text-muted"
            onClick={() => {
              startTransition(async () => {
                await ignoreVendorCategory(projectId, candidate.categoryId);
              });
            }}
          >
            Ignore
          </Button>
        </div>
      </div>
    </div>
  );
}

function IgnoredList({
  items,
  projectId,
}: {
  items: IgnoredVendorCategory[];
  projectId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.categoryId}
          className="flex items-center justify-between gap-3"
        >
          <span className="min-w-0 truncate text-[14px] font-medium text-ink">
            {item.label}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            className="shrink-0 text-muted"
            onClick={() => {
              startTransition(async () => {
                await unignoreVendorCategory(projectId, item.categoryId);
              });
            }}
          >
            Un-ignore
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Budget-sourced categories still to book — quieter than the Booked band. */
export function VendorsToBookSection({
  candidates,
  ignored,
}: {
  candidates: ToBookCandidate[];
  ignored: IgnoredVendorCategory[];
}) {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  if (candidates.length === 0 && ignored.length === 0) {
    return null;
  }

  const sortedCandidates = [...candidates].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const sortedIgnored = [...ignored].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <Card className="space-y-4 px-6 py-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Still to book
      </p>

      {sortedCandidates.length > 0 ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {sortedCandidates.map((candidate) => (
            <ToBookCard
              key={candidate.categoryId}
              candidate={candidate}
              projectId={projectId}
            />
          ))}
        </div>
      ) : null}

      {sortedIgnored.length > 0 ? (
        <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
          <CollapseSection
            title={
              <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                Ignored ({sortedIgnored.length})
              </span>
            }
            headerClassName="py-1"
            bodyClassName="pt-3"
            defaultOpen={false}
          >
            <IgnoredList items={sortedIgnored} projectId={projectId} />
          </CollapseSection>
        </div>
      ) : null}
    </Card>
  );
}
