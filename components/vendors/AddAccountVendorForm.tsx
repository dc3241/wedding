"use client";

import { useState, useTransition } from "react";
import { createAccountVendor } from "@/app/(app)/vendors/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";

export function AddAccountVendorForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const categoryRaw = ((form.get("category") as string) ?? "").trim();

    startTransition(async () => {
      const result = await createAccountVendor({
        name: (form.get("name") as string) ?? "",
        category: categoryRaw || null,
        contactName: (form.get("contact_name") as string) || undefined,
        contactEmail: (form.get("contact_email") as string) || undefined,
        contactPhone: (form.get("contact_phone") as string) || undefined,
        website: (form.get("website") as string) || undefined,
        serviceArea: (form.get("service_area") as string) || undefined,
        address: (form.get("address") as string) || undefined,
        notes: (form.get("notes") as string) || undefined,
        isPreferred: form.get("is_preferred") === "on",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      e.currentTarget.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Add vendor
      </Button>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="library-vendor-name"
              className="text-sm font-medium text-ink"
            >
              Name
            </label>
            <Input
              id="library-vendor-name"
              name="name"
              type="text"
              required
              disabled={isPending}
              placeholder="Bloom & Branch Florals"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-category"
              className="text-sm font-medium text-ink"
            >
              Category
            </label>
            <Select
              id="library-vendor-category"
              name="category"
              disabled={isPending}
              defaultValue=""
            >
              <option value="">Uncategorized</option>
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-contact-name"
              className="text-sm font-medium text-ink"
            >
              Contact name
            </label>
            <Input
              id="library-vendor-contact-name"
              name="contact_name"
              type="text"
              disabled={isPending}
              placeholder="Alex Rivera"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-email"
              className="text-sm font-medium text-ink"
            >
              Email
            </label>
            <Input
              id="library-vendor-email"
              name="contact_email"
              type="email"
              disabled={isPending}
              placeholder="hello@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-phone"
              className="text-sm font-medium text-ink"
            >
              Phone
            </label>
            <Input
              id="library-vendor-phone"
              name="contact_phone"
              type="tel"
              disabled={isPending}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-website"
              className="text-sm font-medium text-ink"
            >
              Website
            </label>
            <Input
              id="library-vendor-website"
              name="website"
              type="url"
              disabled={isPending}
              placeholder="https://"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="library-vendor-service-area"
              className="text-sm font-medium text-ink"
            >
              Service area
            </label>
            <Input
              id="library-vendor-service-area"
              name="service_area"
              type="text"
              disabled={isPending}
              placeholder="Bay Area"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="library-vendor-address"
              className="text-sm font-medium text-ink"
            >
              Address
            </label>
            <Input
              id="library-vendor-address"
              name="address"
              type="text"
              disabled={isPending}
              placeholder="Street, city"
              autoComplete="street-address"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="library-vendor-notes"
              className="text-sm font-medium text-ink"
            >
              Notes
            </label>
            <Textarea
              id="library-vendor-notes"
              name="notes"
              rows={3}
              disabled={isPending}
              placeholder="Relationship notes across weddings"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                name="is_preferred"
                disabled={isPending}
                className="size-4 rounded border-ring text-sage accent-sage"
              />
              Preferred vendor
            </label>
          </div>
        </div>
        {error ? (
          <p className="text-[14px] font-medium text-rosewood">{error}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add to library"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="text-muted"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
