"use client";

import { useState, useTransition } from "react";
import { updateVendorContactDetails } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VendorContactFields({
  vendorId,
  contactPhone,
  address,
}: {
  vendorId: string;
  contactPhone: string | null;
  address: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextPhone = ((form.get("contact_phone") as string) ?? "").trim();
    const nextAddress = ((form.get("address") as string) ?? "").trim();

    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await updateVendorContactDetails(vendorId, {
        contactPhone: nextPhone,
        address: nextAddress,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Contact
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="vendor-contact-phone"
            className="text-sm font-medium text-ink"
          >
            Phone
          </label>
          <Input
            id="vendor-contact-phone"
            name="contact_phone"
            type="tel"
            defaultValue={contactPhone ?? ""}
            placeholder="(555) 555-5555"
            disabled={isPending}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="vendor-address"
            className="text-sm font-medium text-ink"
          >
            Address
          </label>
          <Input
            id="vendor-address"
            name="address"
            type="text"
            defaultValue={address ?? ""}
            placeholder="Street, city"
            disabled={isPending}
            autoComplete="street-address"
          />
        </div>
      </div>
      {error ? (
        <p className="text-[14px] font-medium text-rosewood">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-[13px] text-sage">Saved</p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Saving…" : "Save contact"}
      </Button>
    </form>
  );
}
