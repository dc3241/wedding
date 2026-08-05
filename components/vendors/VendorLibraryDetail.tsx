"use client";

import { useState, useTransition } from "react";
import {
  refreshVendorFromWebsite,
  updateAccountVendor,
} from "@/app/(app)/vendors/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";

export type LibraryDetailVendor = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  service_area: string | null;
  address: string | null;
  notes: string | null;
  is_preferred: boolean;
  source: string;
  ai_overview: string | null;
  last_enriched_at: string | null;
  instagram: string | null;
};

function formatEnrichedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sourceBadgeLabel(source: string) {
  if (source === "google_places") return "Added from search";
  return "Added manually";
}

/** Normalize a stored Instagram value into a display handle + href. */
export function formatInstagramLink(
  value: string | null,
): { href: string; label: string } | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    let label = raw;
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0]) label = `@${parts[0]}`;
    } catch {
      // keep raw
    }
    return { href: raw, label };
  }

  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "");
  if (!handle) return null;
  return {
    href: `https://instagram.com/${handle}`,
    label: `@${handle}`,
  };
}

export function VendorLibraryDetail({
  vendor,
}: {
  vendor: LibraryDetailVendor;
}) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaved, setFormSaved] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewSaved, setOverviewSaved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categoryIsCanonical =
    vendor.category !== null &&
    VENDOR_CATEGORIES.some((c) => c.id === vendor.category);
  const categoryLabel = vendor.category
    ? vendorCategoryLabel(vendor.category)
    : "Uncategorized";
  const hasWebsite = Boolean(vendor.website?.trim());
  const hasOverview = Boolean(vendor.ai_overview?.trim());
  const enrichedLabel = formatEnrichedAt(vendor.last_enriched_at);
  const instagram = formatInstagramLink(vendor.instagram);

  function togglePreferred() {
    startTransition(async () => {
      setFormError(null);
      setFormSaved(false);
      const result = await updateAccountVendor(vendor.id, {
        isPreferred: !vendor.is_preferred,
      });
      if (!result.ok) setFormError(result.error);
    });
  }

  function handleDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSaved(false);
    const form = new FormData(e.currentTarget);
    const categoryRaw = ((form.get("category") as string) ?? "").trim();
    const categoryUpdate =
      categoryRaw || categoryIsCanonical
        ? { category: categoryRaw || null }
        : {};

    startTransition(async () => {
      const result = await updateAccountVendor(vendor.id, {
        name: (form.get("name") as string) ?? "",
        ...categoryUpdate,
        contactName: (form.get("contact_name") as string) ?? "",
        contactEmail: (form.get("contact_email") as string) ?? "",
        contactPhone: (form.get("contact_phone") as string) ?? "",
        website: (form.get("website") as string) ?? "",
        serviceArea: (form.get("service_area") as string) ?? "",
        address: (form.get("address") as string) ?? "",
        notes: (form.get("notes") as string) ?? "",
        instagram: (form.get("instagram") as string) ?? "",
        isPreferred: form.get("is_preferred") === "on",
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setFormSaved(true);
    });
  }

  function handleOverviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOverviewError(null);
    setOverviewSaved(false);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateAccountVendor(vendor.id, {
        aiOverview: (form.get("ai_overview") as string) ?? "",
      });
      if (!result.ok) {
        setOverviewError(result.error);
        return;
      }
      setOverviewSaved(true);
    });
  }

  function handleRefresh() {
    if (!hasWebsite || isRefreshing) return;

    if (hasOverview) {
      const confirmed = window.confirm(
        "Replace the current details with a fresh read of the website?",
      );
      if (!confirmed) return;
    }

    setOverviewError(null);
    setOverviewSaved(false);
    setIsRefreshing(true);
    startTransition(async () => {
      const result = await refreshVendorFromWebsite(vendor.id);
      setIsRefreshing(false);
      if (!result.ok) {
        setOverviewError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[42px] font-extrabold tracking-[-0.03em] text-ink max-md:text-[32px]">
            {vendor.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-muted">{categoryLabel}</p>
            <span className="rounded-[var(--radius-pill)] bg-well px-2.5 py-0.5 text-[12px] font-semibold text-muted shadow-recessed">
              {sourceBadgeLabel(vendor.source)}
            </span>
            {instagram ? (
              <a
                href={instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-accent no-underline hover:underline"
              >
                {instagram.label}
              </a>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={togglePreferred}
          disabled={isPending}
          aria-pressed={vendor.is_preferred}
          aria-label={
            vendor.is_preferred ? "Remove preferred" : "Mark as preferred"
          }
          className={cn(
            "rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:opacity-50",
            vendor.is_preferred
              ? "bg-accent-wash text-sage"
              : "bg-well text-muted shadow-recessed hover:text-sage",
          )}
        >
          {vendor.is_preferred ? "★ Preferred" : "☆ Prefer"}
        </button>
      </div>

      <Card className="p-6">
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
            Details
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-ink" htmlFor="detail-name">
                Name
              </label>
              <Input
                id="detail-name"
                name="name"
                defaultValue={vendor.name}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-category"
              >
                Category
              </label>
              <Select
                id="detail-category"
                name="category"
                defaultValue={categoryIsCanonical ? (vendor.category ?? "") : ""}
                disabled={isPending}
              >
                <option value="">Uncategorized</option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </Select>
              {vendor.category && !categoryIsCanonical ? (
                <p className="text-[12px] text-muted">
                  Currently “{vendorCategoryLabel(vendor.category)}” (legacy).
                  Pick a category to update it.
                </p>
              ) : null}
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  name="is_preferred"
                  defaultChecked={vendor.is_preferred}
                  disabled={isPending}
                  className="size-4 rounded border-ring text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                Preferred
              </label>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-contact-name"
              >
                Contact name
              </label>
              <Input
                id="detail-contact-name"
                name="contact_name"
                defaultValue={vendor.contact_name ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-contact-email"
              >
                Email
              </label>
              <Input
                id="detail-contact-email"
                name="contact_email"
                type="email"
                defaultValue={vendor.contact_email ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-contact-phone"
              >
                Phone
              </label>
              <Input
                id="detail-contact-phone"
                name="contact_phone"
                type="tel"
                defaultValue={vendor.contact_phone ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-website"
              >
                Website
              </label>
              <Input
                id="detail-website"
                name="website"
                type="url"
                defaultValue={vendor.website ?? ""}
                placeholder="https://"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-instagram"
              >
                Instagram
              </label>
              <Input
                id="detail-instagram"
                name="instagram"
                defaultValue={vendor.instagram ?? ""}
                placeholder="@handle or URL"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-service-area"
              >
                Service area
              </label>
              <Input
                id="detail-service-area"
                name="service_area"
                defaultValue={vendor.service_area ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-address"
              >
                Address
              </label>
              <Input
                id="detail-address"
                name="address"
                defaultValue={vendor.address ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-sm font-medium text-ink"
                htmlFor="detail-notes"
              >
                Notes
              </label>
              <Textarea
                id="detail-notes"
                name="notes"
                rows={3}
                defaultValue={vendor.notes ?? ""}
                disabled={isPending}
              />
            </div>
          </div>

          {formError ? (
            <p className="text-[14px] font-medium text-rosewood">{formError}</p>
          ) : null}
          {formSaved ? (
            <p className="text-[13px] text-sage">Saved</p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending && !isRefreshing ? "Saving…" : "Save details"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
              Overview
            </p>
            {enrichedLabel ? (
              <p className="mt-1 text-[13px] text-muted">
                Last updated {enrichedLabel}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-muted">Not refreshed yet</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              disabled={!hasWebsite || isPending || isRefreshing}
            >
              {isRefreshing ? "Refreshing…" : "Refresh from website"}
            </Button>
            {!hasWebsite ? (
              <p className="max-w-[220px] text-right text-[12px] text-muted">
                Add a website above to refresh from their site.
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleOverviewSubmit} className="mt-4 space-y-3">
          <label className="sr-only" htmlFor="detail-ai-overview">
            Overview
          </label>
          <Textarea
            id="detail-ai-overview"
            name="ai_overview"
            rows={5}
            defaultValue={vendor.ai_overview ?? ""}
            placeholder="No overview yet. Refresh from website or write one here."
            disabled={isPending}
          />

          {overviewError ? (
            <p className="text-[14px] font-medium text-rosewood">
              {overviewError}
            </p>
          ) : null}
          {overviewSaved ? (
            <p className="text-[13px] text-sage">Saved</p>
          ) : null}

          <Button type="submit" variant="secondary" disabled={isPending}>
            Save overview
          </Button>
        </form>
      </Card>
    </div>
  );
}
