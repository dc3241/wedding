"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftOutreach } from "@/app/(app)/projects/[projectId]/vendors/outreach/actions";
import {
  AddVendorForm,
  type ConnectableCategoryTarget,
  type ExistingProjectVendor,
} from "@/components/vendors/AddVendorForm";
import { DeclinedVendorsGroup } from "@/components/vendors/DeclinedVendorsGroup";
import { OutreachShortlistRow } from "@/components/vendors/OutreachVendorRow";
import {
  IN_FLIGHT_STATUSES,
  OUTREACH_STATUS_HEADING,
  type InFlightStatus,
  type OutreachVendor,
} from "@/components/vendors/outreach-vendor";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OutreachBrief } from "@/lib/generate-outreach-draft";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | InFlightStatus;

const FILTER_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "to_contact", label: "To contact" },
  { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" },
];

export function OutreachRegion({
  projectId,
  items,
  declinedItems,
  defaultDate,
  existingVendors,
  categoryTargets,
  defaultCategoryId = null,
}: {
  projectId: string;
  items: OutreachVendor[];
  declinedItems: OutreachVendor[];
  defaultDate: string;
  existingVendors: ExistingProjectVendor[];
  categoryTargets: ConnectableCategoryTarget[];
  defaultCategoryId?: string | null;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showAdd, setShowAdd] = useState(() => Boolean(defaultCategoryId));
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isDraftPending, startDraftTransition] = useTransition();

  // Global count — never from the filtered subset (BUD-FILTER-01).
  const toContactCount = items.filter(
    (item) => item.status === "to_contact",
  ).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#add-vendor") {
      setShowAdd(true);
    }
  }, []);

  // Prune selection when a vendor leaves the outreach list (advance to booked / remove).
  useEffect(() => {
    const present = new Set(items.map((item) => item.id));
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (present.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [items]);

  const visibleItems =
    statusFilter === "all"
      ? items
      : items.filter((item) => item.status === statusFilter);

  const groups = IN_FLIGHT_STATUSES.map((status) => ({
    status,
    label: OUTREACH_STATUS_HEADING[status],
    items: visibleItems.filter((item) => item.status === status),
  })).filter((group) => group.items.length > 0);

  // Draft eligibility unchanged — only to_contact IDs are sent to draftOutreach.
  const selectedToContactIds = [...selected].filter((id) =>
    items.some((item) => item.id === id && item.status === "to_contact"),
  );

  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selected.has(item.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const item of visibleItems) next.delete(item.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const item of visibleItems) next.add(item.id);
        return next;
      });
    }
  }

  function handleDraftSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const brief: OutreachBrief = {
      date: (form.get("date") as string) ?? "",
      venueArea: (form.get("venueArea") as string) ?? "",
      budgetVibe: (form.get("budgetVibe") as string) ?? "",
      askingFor: (form.get("askingFor") as string) ?? "",
    };

    startDraftTransition(async () => {
      setDraftError(null);
      const result = await draftOutreach(
        projectId,
        selectedToContactIds,
        brief,
      );

      if (result?.ok === false) {
        setDraftError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <Eyebrow>Outreach</Eyebrow>
            <p className="text-[13px] font-medium text-muted tabular-nums">
              {toContactCount === 1
                ? "1 to contact"
                : `${toContactCount} to contact`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              aria-expanded={showAdd}
              className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {showAdd ? "Hide add" : "+ Add manually"}
            </button>
            <ButtonLink
              href={`/projects/${projectId}/vendors/outreach`}
              variant="default"
              className="text-[13px]"
            >
              Review drafts
            </ButtonLink>
            <Button
              type="button"
              variant="primary"
              disabled={selectedToContactIds.length === 0 || isDraftPending}
              onClick={() => {
                setDraftError(null);
                setShowDraftForm(true);
              }}
              className="text-[13px]"
            >
              Draft outreach
              {selectedToContactIds.length > 0
                ? ` (${selectedToContactIds.length})`
                : ""}
            </Button>
          </div>
        </div>

        {showAdd ? (
          <div className="mt-4 border-t border-hairline pt-4">
            <AddVendorForm
              projectId={projectId}
              existingVendors={existingVendors}
              categoryTargets={categoryTargets}
              defaultCategoryId={defaultCategoryId}
              embedded
            />
          </div>
        ) : (
          // Keep #add-vendor anchor for Booked empty-slot deep links even when collapsed.
          <div id="add-vendor" className="scroll-mt-6" hidden aria-hidden />
        )}

        {showDraftForm ? (
          <div className="mt-4 rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed">
            <form onSubmit={handleDraftSubmit} className="space-y-4">
              <div>
                <Eyebrow>Outreach brief</Eyebrow>
                <p className="mt-1 text-[13px] text-muted">
                  We&apos;ll draft a tailored email for each selected vendor
                  using these details.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="brief-date"
                    className="text-sm font-medium text-ink"
                  >
                    Date
                  </label>
                  <Input
                    id="brief-date"
                    name="date"
                    type="text"
                    defaultValue={defaultDate}
                    placeholder="e.g. October 18, 2026"
                    disabled={isDraftPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="brief-venue"
                    className="text-sm font-medium text-ink"
                  >
                    Venue / area
                  </label>
                  <Input
                    id="brief-venue"
                    name="venueArea"
                    type="text"
                    placeholder="e.g. Phoenix, AZ"
                    disabled={isDraftPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="brief-budget"
                  className="text-sm font-medium text-ink"
                >
                  Budget vibe
                </label>
                <Input
                  id="brief-budget"
                  name="budgetVibe"
                  type="text"
                  placeholder="e.g. mid-range, flexible on florals"
                  disabled={isDraftPending}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="brief-asking"
                  className="text-sm font-medium text-ink"
                >
                  What you&apos;re asking for
                </label>
                <Textarea
                  id="brief-asking"
                  name="askingFor"
                  required
                  rows={3}
                  placeholder="e.g. Full wedding florals — bouquets, ceremony arch, and 12 reception centerpieces"
                  disabled={isDraftPending}
                />
              </div>

              {draftError ? (
                <p className="text-sm text-rosewood">{draftError}</p>
              ) : null}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isDraftPending}
                >
                  {isDraftPending ? "Drafting…" : "Generate drafts"}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={isDraftPending}
                  onClick={() => setShowDraftForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-[13px] font-medium text-muted">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  disabled={visibleItems.length === 0}
                  className="size-4 rounded border-ring accent-accent disabled:opacity-50"
                />
                Select all
              </label>

              <div
                role="tablist"
                aria-label="Filter by outreach status"
                className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
              >
                {FILTER_OPTIONS.map((option) => {
                  const active = statusFilter === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatusFilter(option.id)}
                      className={cn(
                        "cursor-pointer rounded-[var(--radius-pill)] border-none px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                        active
                          ? "bg-accent-wash text-accent"
                          : "bg-transparent text-muted hover:text-ink",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="px-1 py-6 text-center text-[15px] font-medium text-muted">
                No vendors match this filter.
              </p>
            ) : (
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.status}>
                    <div className="mb-2 flex items-baseline gap-2 px-0.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                        {group.label}
                      </p>
                      <p className="text-[13px] text-muted tabular-nums">
                        {group.items.length}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <OutreachShortlistRow
                            projectId={projectId}
                            item={item}
                            selectable
                            selected={selected.has(item.id)}
                            onToggleSelect={() => toggle(item.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 px-2 py-6 text-center">
            <p className="text-[15px] font-medium text-muted">
              {declinedItems.length > 0
                ? "No vendors in flight. Declined vendors are below."
                : "No vendors in outreach yet. Search or add one manually."}
            </p>
            {declinedItems.length === 0 ? (
              <AskAssistantPrompt
                className="mx-auto mt-4 max-w-md"
                prefill={ASSISTANT_PREFILLS.vendors}
                title="Not sure which vendors to chase first?"
                description="Ask for priority categories and what to look for when shortlisting."
                cta="Find vendors"
              />
            ) : null}
          </div>
        )}
      </Card>

      <DeclinedVendorsGroup projectId={projectId} items={declinedItems} />
    </div>
  );
}
