"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  getVendorCategoryById,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";

export type NeededVendorTarget = {
  id: string;
  category: string;
  note: string | null;
};

function StillNeededCard({
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
  if (targets.length === 0) return null;

  return (
    <div className="rounded-lg border-[0.5px] border-stone bg-surface px-3.5 py-3.5 sm:px-4 sm:py-4">
      <Eyebrow>Still needed</Eyebrow>
      <ul className="mt-3 space-y-2.5">
        {targets.map((target) => {
          const canonical = getVendorCategoryById(target.category);
          const label = vendorCategoryLabel(target.category);
          const note = target.note?.trim() || null;

          if (!canonical) {
            return (
              <li key={target.id} className="min-w-0">
                <span className="text-[13px] text-ink-muted">{label}</span>
                {note ? (
                  <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                    {note}
                  </p>
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
                    ? "rounded border-[0.5px] border-stone bg-stone-soft px-2.5 py-1 text-[13px] font-medium text-ink"
                    : "rounded border-[0.5px] border-stone bg-transparent px-2.5 py-1 text-[13px] font-medium text-ink hover:bg-stone-soft/60"
                }
              >
                {label}
              </button>
              {note ? (
                <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                  {note}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
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
    <p className="text-[13px] text-ink-muted">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-ink-muted hover:text-ink"
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
}: {
  projectId: string;
  neededTargets: NeededVendorTarget[];
  activeCategoryId: string;
  onListCount: number;
  disabled?: boolean;
  onSelectCategory: (categoryId: string) => void;
}) {
  const hasStillNeeded = neededTargets.length > 0;
  const hasOnList = onListCount > 0 && Boolean(activeCategoryId);

  if (!hasStillNeeded && !hasOnList) return null;

  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
      {hasStillNeeded ? (
        <StillNeededCard
          targets={neededTargets}
          activeCategoryId={activeCategoryId}
          disabled={disabled}
          onSelectCategory={onSelectCategory}
        />
      ) : null}
      {hasOnList ? (
        <OnYourListLink
          projectId={projectId}
          categoryId={activeCategoryId}
          count={onListCount}
        />
      ) : null}
    </aside>
  );
}
