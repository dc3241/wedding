"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
import {
  getVendorCategoryById,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";

export type NeededVendorTarget = {
  id: string;
  category: string;
  note: string | null;
};

function StillNeededBody({
  targets,
  activeCategoryId,
  disabled,
  onSelectCategory,
}: {
  targets: NeededVendorTarget[];
  activeCategoryId: string;
  disabled?: boolean;
  onSelectCategory: (categoryId: string) => void;
}) {
  return (
    <ul className="space-y-2.5">
      {targets.map((target) => {
        const canonical = getVendorCategoryById(target.category);
        const label = vendorCategoryLabel(target.category);
        const note = target.note?.trim() || null;

        if (!canonical) {
          return (
            <li key={target.id} className="min-w-0">
              <span className="text-[13px] text-muted">{label}</span>
              {note ? (
                <p className="mt-0.5 truncate text-[12px] text-muted">{note}</p>
              ) : null}
            </li>
          );
        }

        const selected = activeCategoryId === canonical.id;

        return (
          <li key={target.id} className="min-w-0">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSelectCategory(canonical.id)}
              className={
                selected
                  ? "rounded-[var(--radius-pill)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-surface"
                  : "rounded-[var(--radius-pill)] bg-well px-3 py-1.5 text-[13px] font-semibold text-muted hover:text-ink"
              }
            >
              {label}
            </button>
            {note ? (
              <p className="mt-0.5 truncate text-[12px] text-muted">{note}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

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
  neededTargets,
  activeCategoryId,
  onListCount,
  disabled,
  onSelectCategory,
  filterSlot,
}: {
  projectId: string;
  neededTargets: NeededVendorTarget[];
  activeCategoryId: string;
  onListCount: number;
  disabled?: boolean;
  onSelectCategory: (categoryId: string) => void;
  /** Optional filter/sort card rendered above Still needed / On your list. */
  filterSlot?: ReactNode;
}) {
  const hasStillNeeded = neededTargets.length > 0;
  const hasOnList = onListCount > 0 && Boolean(activeCategoryId);

  if (!filterSlot && !hasStillNeeded && !hasOnList) return null;

  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
      {filterSlot}

      {hasStillNeeded || hasOnList ? (
        <Card className="overflow-hidden p-0">
          {hasStillNeeded ? (
            <CollapseSection
              title={
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Still needed
                </span>
              }
              headerClassName="px-6 py-4"
              bodyClassName="px-6 pb-[22px]"
              defaultOpen
            >
              <StillNeededBody
                targets={neededTargets}
                activeCategoryId={activeCategoryId}
                disabled={disabled}
                onSelectCategory={onSelectCategory}
              />
            </CollapseSection>
          ) : null}

          {hasOnList ? (
            <div
              className={
                hasStillNeeded
                  ? "border-t border-hairline px-6 py-4"
                  : "px-6 py-4"
              }
            >
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
          ) : null}
        </Card>
      ) : null}
    </aside>
  );
}
