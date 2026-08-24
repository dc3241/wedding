"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeProjectVendor } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

export function UsedOnProjectRow({
  projectVendorId,
  href,
  projectName,
  vendorName,
  statusVariant,
  statusLabel,
  meta,
}: {
  projectVendorId: string;
  href: string;
  projectName: string;
  vendorName: string;
  statusVariant: PillVariant;
  statusLabel: string;
  meta: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${vendorName} from ${projectName}?\n\nThis removes them from this project, permanently deletes their outreach message history, and unlinks them from any budget item or task.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await removeProjectVendor(projectVendorId);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed",
        isPending && "opacity-60",
      )}
    >
      <Link
        href={href}
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-[15px] font-medium text-ink no-underline transition-colors hover:text-accent"
      >
        <span className="min-w-0 truncate">{projectName}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Pill variant={statusVariant}>{statusLabel}</Pill>
          {meta ? (
            <span className="text-[13px] font-normal text-muted tabular-nums">
              {meta}
            </span>
          ) : null}
        </span>
      </Link>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        aria-label={`Remove ${vendorName} from ${projectName}`}
        className="shrink-0 rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50"
      >
        Remove from this booking
      </button>
    </div>
  );
}
