"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

function OnYourListLink({
  projectId,
  categoryId,
  count,
}: {
  projectId: string;
  categoryId: string;
  count: number;
}) {
  if (count <= 0 || !categoryId) return null;

  const label = vendorCategoryLabel(categoryId).toLowerCase();
  const noun = count === 1 ? label : `${label}s`;

  return (
    <p className="text-[13px] text-muted">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-muted hover:text-ink"
      >
        <span className="tabnum">{count}</span> {noun} on your list
      </Link>
    </p>
  );
}

export function VendorSearchRail({
  projectId,
  activeCategoryId,
  onListCount,
  filterSlot,
}: {
  projectId: string;
  activeCategoryId: string;
  onListCount: number;
  /** Optional filter/sort card rendered above On your list. */
  filterSlot?: ReactNode;
}) {
  const hasOnList = onListCount > 0 && Boolean(activeCategoryId);

  if (!filterSlot && !hasOnList) return null;

  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
      {filterSlot}

      {hasOnList ? (
        <Card className="overflow-hidden p-0">
          <div className="px-6 py-4">
            <CollapseSection
              title={
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  On your list
                </span>
              }
              headerClassName="pb-2"
              bodyClassName=""
              defaultOpen
            >
              <OnYourListLink
                projectId={projectId}
                categoryId={activeCategoryId}
                count={onListCount}
              />
            </CollapseSection>
          </div>
        </Card>
      ) : null}
    </aside>
  );
}
