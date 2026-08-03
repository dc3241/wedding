"use client";

import { useState, useTransition } from "react";
import {
  addVendor,
  linkVendorToTarget,
  type AddVendorStatus,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";

export type ExistingProjectVendor = {
  projectVendorId: string;
  name: string;
  category: string | null;
};

export type ConnectableCategoryTarget = {
  id: string;
  category: string;
  project_vendor_id: string | null;
  linkedVendorName?: string | null;
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

/** Project-wide name match — category must not scope the soft guard. */
function findSoftDuplicate(
  existing: ExistingProjectVendor[],
  name: string,
) {
  return existing.find((row) => isCloseNameMatch(row.name, name)) ?? null;
}

export function AddVendorForm({
  projectId,
  existingVendors,
  categoryTargets = [],
  defaultCategoryId = null,
  embedded = false,
}: {
  projectId: string;
  existingVendors: ExistingProjectVendor[];
  categoryTargets?: ConnectableCategoryTarget[];
  defaultCategoryId?: string | null;
  /** When true, omit Card + eyebrow — parent owns chrome (VND-12). */
  embedded?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatch, setDuplicateMatch] =
    useState<ExistingProjectVendor | null>(null);
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
      contactPhone,
      nextStatus,
    }: {
      name: string;
      categoryId: string;
      contactEmail: string;
      contactPhone: string;
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
        contactPhone,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDuplicateMatch(null);
      formEl.reset();
      setStatus("to_contact");
    });
  }

  function readFields(form: FormData) {
    return {
      name: ((form.get("name") as string) ?? "").trim(),
      categoryId: ((form.get("category") as string) ?? "").trim(),
      contactEmail: ((form.get("contact_email") as string) ?? "").trim(),
      contactPhone: ((form.get("contact_phone") as string) ?? "").trim(),
    };
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(new FormData(e.currentTarget));
    if (!fields.name || !fields.categoryId) return;

    const formEl = e.currentTarget;
    const match = findSoftDuplicate(existingVendors, fields.name);
    if (match && !duplicateMatch) {
      setDuplicateMatch(match);
      setError(null);
      return;
    }

    submit(formEl, { ...fields, nextStatus: status });
  }

  function handleAddAnyway(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(new FormData(e.currentTarget));
    if (!fields.name || !fields.categoryId) return;
    submit(e.currentTarget, { ...fields, nextStatus: status });
  }

  function handleConnectExisting(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!duplicateMatch) return;

    const formEl = e.currentTarget.form;
    if (!formEl) return;

    const form = new FormData(formEl);
    const categoryId = ((form.get("category") as string) ?? "").trim();
    if (!categoryId) {
      setError("Choose a category to connect to.");
      return;
    }

    const target = categoryTargets.find((t) => t.category === categoryId);
    if (!target) {
      setError(
        `${vendorCategoryLabel(categoryId)} isn’t on your list to book yet. Add that category first, then connect.`,
      );
      return;
    }

    if (
      target.project_vendor_id != null &&
      target.project_vendor_id !== duplicateMatch.projectVendorId
    ) {
      const outgoing = target.linkedVendorName?.trim() || "the current vendor";
      const ok = window.confirm(
        `Replace ${outgoing} on ${vendorCategoryLabel(categoryId)}?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      setError(null);
      try {
        await linkVendorToTarget(target.id, duplicateMatch.projectVendorId);
        setDuplicateMatch(null);
        formEl.reset();
        setStatus("to_contact");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not connect that vendor.",
        );
      }
    });
  }

  const form = (
    <form
      onSubmit={duplicateMatch ? handleAddAnyway : handleSubmit}
      className="space-y-3"
    >
      {!embedded ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Eyebrow>Add manually</Eyebrow>
          <p className="text-[13px] text-muted">
            Fallback when search doesn’t find them
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="vendor-name" className="text-[13px] font-medium text-ink">
            Name
          </label>
          <Input
            id="vendor-name"
            name="name"
            type="text"
            required
            placeholder="Vendor name"
            disabled={isPending}
            onChange={() => setDuplicateMatch(null)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="vendor-category"
            className="text-[13px] font-medium text-ink"
          >
            Category
          </label>
          <Select
            id="vendor-category"
            name="category"
            required
            defaultValue={categoryDefault}
            disabled={isPending}
            onChange={() => setDuplicateMatch(null)}
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
        <div className="space-y-1">
          <label
            htmlFor="vendor-email"
            className="text-[13px] font-medium text-ink"
          >
            Email
          </label>
          <Input
            id="vendor-email"
            name="contact_email"
            type="email"
            placeholder="hello@vendor.com"
            disabled={isPending}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="vendor-phone"
            className="text-[13px] font-medium text-ink"
          >
            Phone
          </label>
          <Input
            id="vendor-phone"
            name="contact_phone"
            type="tel"
            placeholder="(555) 555-5555"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">Status</legend>
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <input
              type="radio"
              name="add_status"
              value="to_contact"
              checked={status === "to_contact"}
              onChange={() => setStatus("to_contact")}
              disabled={isPending}
              className="size-3.5 border-ring accent-accent"
            />
            Still to contact
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <input
              type="radio"
              name="add_status"
              value="booked"
              checked={status === "booked"}
              onChange={() => setStatus("booked")}
              disabled={isPending}
              className="size-3.5 border-ring accent-accent"
            />
            Already booked
          </label>
        </fieldset>

        {!duplicateMatch ? (
          <Button
            type="submit"
            variant="secondary"
            disabled={isPending}
            className="ml-auto text-[13px]"
          >
            {isPending ? "Adding…" : "Add vendor"}
          </Button>
        ) : null}
      </div>

      {duplicateMatch ? (
        <div className="space-y-3 rounded-[var(--radius-inner)] bg-clay-wash px-4 py-3 text-[14px] text-ink">
          <p>
            You already have{" "}
            <span className="font-semibold">{duplicateMatch.name}</span> on
            this project. Connect them to this category instead?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleConnectExisting}
              className="text-[13px]"
            >
              {isPending
                ? "Connecting…"
                : "Connect the existing vendor to this category instead"}
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isPending}
              className="text-[13px]"
            >
              Add anyway
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-[14px] font-medium text-rosewood">{error}</p>
      ) : null}
    </form>
  );

  if (embedded) {
    return (
      <div id="add-vendor" className="scroll-mt-6">
        {form}
      </div>
    );
  }

  return (
    <Card id="add-vendor" className={cn("px-5 py-4 scroll-mt-6")}>
      {form}
    </Card>
  );
}
