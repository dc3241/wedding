"use client";

import { useState, useTransition } from "react";
import {
  addVendor,
  type AddVendorStatus,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";

export type ExistingProjectVendor = {
  name: string;
  category: string | null;
};

function normalizeVendorName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isCloseNameMatch(a: string, b: string) {
  const left = normalizeVendorName(a);
  const right = normalizeVendorName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

function findSoftDuplicate(
  existing: ExistingProjectVendor[],
  name: string,
  categoryId: string,
) {
  return existing.find(
    (row) =>
      row.category === categoryId && isCloseNameMatch(row.name, name),
  );
}

export function AddVendorForm({
  projectId,
  existingVendors,
  defaultCategoryId = null,
}: {
  projectId: string;
  existingVendors: ExistingProjectVendor[];
  defaultCategoryId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [status, setStatus] = useState<AddVendorStatus>("to_contact");
  const categoryDefault =
    defaultCategoryId &&
    VENDOR_CATEGORIES.some((c) => c.id === defaultCategoryId)
      ? defaultCategoryId
      : "";

  function submit(
    formEl: HTMLFormElement,
    {
      name,
      categoryId,
      contactEmail,
      nextStatus,
    }: {
      name: string;
      categoryId: string;
      contactEmail: string;
      nextStatus: AddVendorStatus;
    },
  ) {
    startTransition(async () => {
      setError(null);
      const result = await addVendor(
        projectId,
        name,
        categoryId,
        contactEmail,
        nextStatus,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDuplicateWarning(null);
      formEl.reset();
      setStatus("to_contact");
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = ((form.get("name") as string) ?? "").trim();
    const categoryId = ((form.get("category") as string) ?? "").trim();
    const contactEmail = ((form.get("contact_email") as string) ?? "").trim();

    if (!name || !categoryId) return;

    const formEl = e.currentTarget;
    const match = findSoftDuplicate(existingVendors, name, categoryId);
    if (match && !duplicateWarning) {
      setDuplicateWarning(match.name);
      setError(null);
      return;
    }

    submit(formEl, { name, categoryId, contactEmail, nextStatus: status });
  }

  function handleAddAnyway(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = ((form.get("name") as string) ?? "").trim();
    const categoryId = ((form.get("category") as string) ?? "").trim();
    const contactEmail = ((form.get("contact_email") as string) ?? "").trim();
    if (!name || !categoryId) return;
    submit(e.currentTarget, {
      name,
      categoryId,
      contactEmail,
      nextStatus: status,
    });
  }

  return (
    <Card id="add-vendor" className="px-6 py-5 scroll-mt-6">
      <form
        onSubmit={duplicateWarning ? handleAddAnyway : handleSubmit}
        className="space-y-4"
      >
        <div>
          <Eyebrow>Add manually</Eyebrow>
          <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Add vendor
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="vendor-name" className="text-sm font-medium text-ink">
              Name
            </label>
            <Input
              id="vendor-name"
              name="name"
              type="text"
              required
              placeholder="Vendor name"
              disabled={isPending}
              onChange={() => setDuplicateWarning(null)}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-category"
              className="text-sm font-medium text-ink"
            >
              Category
            </label>
            <Select
              id="vendor-category"
              name="category"
              required
              defaultValue={categoryDefault}
              disabled={isPending}
              onChange={() => setDuplicateWarning(null)}
            >
              <option value="" disabled>
                Choose category
              </option>
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-email"
              className="text-sm font-medium text-ink"
            >
              Contact email
            </label>
            <Input
              id="vendor-email"
              name="contact_email"
              type="email"
              placeholder="hello@vendor.com"
              disabled={isPending}
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Status</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <input
                type="radio"
                name="add_status"
                value="to_contact"
                checked={status === "to_contact"}
                onChange={() => setStatus("to_contact")}
                disabled={isPending}
                className="size-4 border-ring accent-accent"
              />
              Still to contact
            </label>
            <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <input
                type="radio"
                name="add_status"
                value="booked"
                checked={status === "booked"}
                onChange={() => setStatus("booked")}
                disabled={isPending}
                className="size-4 border-ring accent-accent"
              />
              Already booked
            </label>
          </div>
        </fieldset>

        {duplicateWarning ? (
          <div className="rounded-[var(--radius-inner)] bg-clay-wash px-4 py-3 text-[14px] text-ink">
            <p>
              You already have{" "}
              <span className="font-semibold">{duplicateWarning}</span> in this
              category on this project. Add anyway?
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-[14px] font-medium text-rosewood">{error}</p>
        ) : null}

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending
            ? "Adding…"
            : duplicateWarning
              ? "Add anyway"
              : "Add vendor"}
        </Button>
      </form>
    </Card>
  );
}
