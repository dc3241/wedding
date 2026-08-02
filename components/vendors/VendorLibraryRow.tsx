"use client";

import { useState, useTransition } from "react";
import {
  deleteAccountVendor,
  setVendorPreferred,
  updateAccountVendor,
} from "@/app/(app)/vendors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";
import type { LibraryVendor } from "@/components/vendors/VendorLibrary";

const destructiveControlClass =
  "rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50";

function MetaLine({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <p className="text-[13px] text-muted">
      <span className="font-medium text-ink/70">{label}: </span>
      {value}
    </p>
  );
}

export function VendorLibraryRow({ vendor }: { vendor: LibraryVendor }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = vendor.linkCount === 0;
  const categoryIsCanonical =
    vendor.category !== null &&
    VENDOR_CATEGORIES.some((c) => c.id === vendor.category);
  const categoryLabel = vendor.category
    ? vendorCategoryLabel(vendor.category)
    : "Uncategorized";

  function togglePreferred() {
    startTransition(async () => {
      setError(null);
      const result = await setVendorPreferred(vendor.id, !vendor.is_preferred);
      if (!result.ok) setError(result.error);
    });
  }

  function handleDelete() {
    if (!canDelete) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteAccountVendor(vendor.id);
      if (!result.ok) setError(result.error);
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const categoryRaw = ((form.get("category") as string) ?? "").trim();

    startTransition(async () => {
      // Preserve legacy free-text categories unless the planner picks a
      // canonical id (or Uncategorized when the current value is already
      // canonical).
      const categoryUpdate =
        categoryRaw || categoryIsCanonical
          ? { category: categoryRaw || null }
          : {};

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
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-medium text-ink">{vendor.name}</p>
            {vendor.is_preferred ? (
              <span className="rounded-[var(--radius-pill)] bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-sage">
                Preferred
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">{categoryLabel}</p>
          {!editing ? (
            <div className="mt-2 space-y-0.5">
              <MetaLine label="Contact" value={vendor.contact_name} />
              <MetaLine label="Email" value={vendor.contact_email} />
              <MetaLine label="Phone" value={vendor.contact_phone} />
              <MetaLine label="Website" value={vendor.website} />
              <MetaLine label="Address" value={vendor.address} />
              <MetaLine label="Service area" value={vendor.service_area} />
              {vendor.notes ? (
                <p className="mt-1.5 text-[13px] text-muted">{vendor.notes}</p>
              ) : null}
              {vendor.linkCount > 0 ? (
                <p className="mt-1.5 text-[12px] text-muted">
                  Linked to {vendor.linkCount} wedding
                  {vendor.linkCount === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={togglePreferred}
            disabled={isPending}
            aria-pressed={vendor.is_preferred}
            aria-label={
              vendor.is_preferred
                ? "Remove preferred"
                : "Mark as preferred"
            }
            className={cn(
              "rounded-[var(--radius-pill)] px-2.5 py-1 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:opacity-50",
              vendor.is_preferred
                ? "bg-surface text-sage"
                : "text-muted hover:bg-surface hover:text-sage",
            )}
          >
            {vendor.is_preferred ? "★ Preferred" : "☆ Prefer"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setError(null);
            }}
            disabled={isPending}
            className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >
            {editing ? "Close" : "Edit"}
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className={cn(destructiveControlClass, "mt-1")}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleEditSubmit} className="mt-4 space-y-3 border-t border-hairline pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-ink" htmlFor={`edit-name-${vendor.id}`}>
                Name
              </label>
              <Input
                id={`edit-name-${vendor.id}`}
                name="name"
                defaultValue={vendor.name}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-category-${vendor.id}`}
              >
                Category
              </label>
              <Select
                id={`edit-category-${vendor.id}`}
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
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-contact-name-${vendor.id}`}
              >
                Contact name
              </label>
              <Input
                id={`edit-contact-name-${vendor.id}`}
                name="contact_name"
                defaultValue={vendor.contact_name ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-email-${vendor.id}`}
              >
                Email
              </label>
              <Input
                id={`edit-email-${vendor.id}`}
                name="contact_email"
                type="email"
                defaultValue={vendor.contact_email ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-phone-${vendor.id}`}
              >
                Phone
              </label>
              <Input
                id={`edit-phone-${vendor.id}`}
                name="contact_phone"
                type="tel"
                defaultValue={vendor.contact_phone ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-website-${vendor.id}`}
              >
                Website
              </label>
              <Input
                id={`edit-website-${vendor.id}`}
                name="website"
                type="url"
                defaultValue={vendor.website ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-service-area-${vendor.id}`}
              >
                Service area
              </label>
              <Input
                id={`edit-service-area-${vendor.id}`}
                name="service_area"
                defaultValue={vendor.service_area ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-address-${vendor.id}`}
              >
                Address
              </label>
              <Input
                id={`edit-address-${vendor.id}`}
                name="address"
                defaultValue={vendor.address ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-sm font-medium text-ink"
                htmlFor={`edit-notes-${vendor.id}`}
              >
                Notes
              </label>
              <Textarea
                id={`edit-notes-${vendor.id}`}
                name="notes"
                rows={3}
                defaultValue={vendor.notes ?? ""}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setEditing(false)}
              className="text-muted"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-2 text-[14px] font-medium text-rosewood">{error}</p>
      ) : null}
    </div>
  );
}
