"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  enrichVendor,
  updateProjectVendorStatus,
} from "@/app/(app)/projects/[projectId]/vendors/actions";

export type OutreachVendor = {
  id: string;
  status: "to_contact" | "contacted" | "booked" | "declined";
  vendor: {
    id: string;
    name: string;
    category: string | null;
    contact_email: string | null;
    website: string | null;
    ai_overview: string | null;
    last_enriched_at: string | null;
  };
};

const STATUS_CYCLE: Record<OutreachVendor["status"], OutreachVendor["status"]> =
  {
    to_contact: "contacted",
    contacted: "booked",
    booked: "declined",
    declined: "to_contact",
  };

const STATUS_LABEL: Record<OutreachVendor["status"], string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  booked: "Booked",
  declined: "Declined",
};

const STATUS_PILL: Record<OutreachVendor["status"], string> = {
  to_contact: "bg-amber-50 text-amber-800",
  contacted: "bg-blue-50 text-blue-700",
  booked: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
};

export function OutreachVendorCard({
  projectId,
  item,
}: {
  projectId: string;
  item: OutreachVendor;
}) {
  const router = useRouter();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [awaitingOverview, setAwaitingOverview] = useState(
    () => !item.vendor.ai_overview && !item.vendor.last_enriched_at
  );

  useEffect(() => {
    if (!awaitingOverview || item.vendor.ai_overview) {
      if (item.vendor.ai_overview) setAwaitingOverview(false);
      return;
    }

    let count = 0;
    const id = setInterval(() => {
      count += 1;
      router.refresh();
      if (count >= 12) {
        clearInterval(id);
        setAwaitingOverview(false);
      }
    }, 3000);

    return () => clearInterval(id);
  }, [awaitingOverview, item.vendor.ai_overview, router]);

  function handleStatusClick() {
    const nextStatus = STATUS_CYCLE[item.status];
    startStatusTransition(async () => {
      await updateProjectVendorStatus(item.id, nextStatus);
    });
  }

  function handleRefreshOverview() {
    startRefreshTransition(async () => {
      setRefreshError(null);
      const result = await enrichVendor(item.vendor.id);
      if (!result.ok) {
        setRefreshError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const isPending = isStatusPending || isRefreshPending;
  const isEnriching = awaitingOverview && !item.vendor.ai_overview;

  return (
    <article
      className={`rounded-md border border-zinc-200 p-4 ${isPending ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-zinc-900">
            <Link
              href={`/projects/${projectId}/vendors/${item.vendor.id}`}
              className="hover:underline"
            >
              {item.vendor.name}
            </Link>
          </h4>
          <p className="mt-0.5 text-sm text-zinc-500">
            {item.vendor.category ?? "Uncategorized"}
            {item.vendor.contact_email ? (
              <span className="text-zinc-400"> · {item.vendor.contact_email}</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshOverview}
            disabled={isRefreshPending}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isRefreshPending ? "Refreshing…" : "Refresh overview"}
          </button>
          <button
            type="button"
            onClick={handleStatusClick}
            disabled={isStatusPending}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[item.status]}`}
          >
            {STATUS_LABEL[item.status]}
          </button>
        </div>
      </div>

      {item.vendor.ai_overview ? (
        <p className="mt-3 whitespace-pre-line text-sm text-zinc-700">
          {item.vendor.ai_overview}
        </p>
      ) : isEnriching ? (
        <p className="mt-3 text-sm text-zinc-400">Generating overview…</p>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">
          No overview yet. Use Refresh overview if this vendor has a website.
        </p>
      )}

      {refreshError ? (
        <p className="mt-2 text-sm text-red-600">{refreshError}</p>
      ) : null}

      {item.vendor.website ? (
        <a
          href={item.vendor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-zinc-500 underline hover:text-zinc-700"
        >
          {item.vendor.website}
        </a>
      ) : null}
    </article>
  );
}

export const OUTREACH_STATUS_ORDER: OutreachVendor["status"][] = [
  "to_contact",
  "contacted",
  "booked",
  "declined",
];

export const OUTREACH_STATUS_HEADING: Record<OutreachVendor["status"], string> =
  {
    to_contact: "To contact",
    contacted: "Contacted",
    booked: "Booked",
    declined: "Declined",
  };
