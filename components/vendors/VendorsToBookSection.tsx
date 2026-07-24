"use client";

import { useParams } from "next/navigation";
import { useState, useTransition } from "react";
import { setVendorTargetStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";

export type VendorTargetRow = {
  id: string;
  category: string;
  note: string | null;
  status: "needed" | "booked" | "skipped";
  project_vendor_id: string | null;
};

const STATUS_LABELS: Record<"needed" | "skipped", string> = {
  needed: "To book",
  skipped: "Skipped",
};

const STATUS_VARIANTS: Record<"needed" | "skipped", PillVariant> = {
  needed: "default",
  skipped: "default",
};

const STATUS_SORT: Record<"needed" | "skipped", number> = {
  needed: 0,
  skipped: 1,
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M2.5 6l2.5 2.5 4.5-5" />
    </svg>
  );
}

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

function TargetActions({
  target,
  projectId,
}: {
  target: VendorTargetRow;
  projectId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: VendorTargetRow["status"]) {
    startTransition(async () => {
      await setVendorTargetStatus(target.id, status);
    });
  }

  const searchHref = `/projects/${projectId}/vendors/search`;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {target.status === "needed" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => setStatus("booked")}
            className="gap-2"
          >
            <CheckIcon />
            Mark booked
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => setStatus("skipped")}
            className="text-muted"
          >
            Skip
          </Button>
          <ButtonLink href={searchHref} variant="secondary" className="gap-2">
            <SearchIcon />
            Find vendors
          </ButtonLink>
        </>
      ) : null}

      {target.status === "skipped" ? (
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => setStatus("needed")}
        >
          Mark to book
        </Button>
      ) : null}
    </div>
  );
}

/** Empty / skipped slots — quieter than the Booked band. */
export function VendorsToBookSection({
  targets,
}: {
  targets: VendorTargetRow[];
}) {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [openId, setOpenId] = useState<string | null>(null);

  const stillOpen = targets.filter(
    (t): t is VendorTargetRow & { status: "needed" | "skipped" } =>
      t.status === "needed" || t.status === "skipped",
  );

  if (stillOpen.length === 0) {
    return null;
  }

  const sorted = [...stillOpen].sort(
    (a, b) => STATUS_SORT[a.status] - STATUS_SORT[b.status],
  );

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="space-y-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Still to book
      </p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {sorted.map((target) => {
          const open = openId === target.id;
          const skipped = target.status === "skipped";

          return (
            <details
              key={target.id}
              className={cn(
                "overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed",
                open && "[grid-column:1/-1]",
                skipped && "opacity-70",
              )}
              open={open}
            >
              <summary
                className="cursor-pointer list-none px-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  toggle(target.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-medium text-ink">
                    {vendorCategoryLabel(target.category)}
                  </span>
                  <span className="shrink-0">
                    <Pill variant={STATUS_VARIANTS[target.status]}>
                      {STATUS_LABELS[target.status]}
                    </Pill>
                  </span>
                </div>
                {target.note && !open ? (
                  <p className="mt-2 truncate text-[13px] text-muted">
                    {target.note}
                  </p>
                ) : null}
              </summary>

              {open ? (
                <div className="space-y-4 px-4 pb-4">
                  {target.note ? (
                    <p className="text-[13px] leading-relaxed text-muted">
                      {target.note}
                    </p>
                  ) : null}
                  <TargetActions target={target} projectId={projectId} />
                </div>
              ) : null}
            </details>
          );
        })}
      </div>
    </section>
  );
}
