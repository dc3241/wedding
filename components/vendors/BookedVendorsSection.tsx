"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  unlinkVendorFromTarget,
  removeProjectVendor,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  ConnectExistingVendorControl,
  type ConnectableBookedVendor,
} from "@/components/vendors/ConnectExistingVendorControl";
import {
  LinkVendorToTargetControl,
  type SlotTargetOption,
} from "@/components/vendors/LinkVendorToTargetControl";
import { Pill } from "@/components/ui/pill";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";

export type BookedSlotVendor = {
  vendorId: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  quoted_price: number | null;
};

/** One raised card per linked project_vendor — may cover many category slots. */
export type BookedPackage = {
  projectVendorId: string;
  vendor: BookedSlotVendor;
  slots: { id: string; category: string; note: string | null }[];
};

/** Booked category with no vendor recorded yet. */
export type EmptyBookedSlot = {
  id: string;
  category: string;
  note: string | null;
};

export type UnslottedBookedVendor = {
  projectVendorId: string;
  vendorId: string;
  name: string;
  category: string | null;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function CategoryChips({ categories }: { categories: string[] }) {
  if (categories.length < 1) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Covered categories">
      {categories.map((id) => (
        <li key={id}>
          <Pill variant="default">{vendorCategoryLabel(id)}</Pill>
        </li>
      ))}
    </ul>
  );
}

function BookedPackageCard({
  projectId,
  pkg,
}: {
  projectId: string;
  pkg: BookedPackage;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const vendor = pkg.vendor;
  const detailHref = `/projects/${projectId}/vendors/${vendor.vendorId}`;
  const categoryIds = pkg.slots.map((s) => s.category);

  const hasContactBits = Boolean(
    vendor.contact_email ||
      vendor.contact_phone ||
      vendor.address ||
      vendor.website ||
      vendor.quoted_price != null ||
      vendor.notes,
  );
  const thinRecord = !hasContactBits;

  function handleUnbook() {
    startTransition(async () => {
      for (const slot of pkg.slots) {
        await unlinkVendorFromTarget(slot.id);
      }
    });
  }

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${vendor.name} from this project?\n\nThis removes them from this project and clears every category slot they cover.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await removeProjectVendor(pkg.projectVendorId);
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised",
        open && "sm:col-span-full",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug text-ink break-words">
            {vendor.name}
          </p>
          <CategoryChips categories={categoryIds} />
        </div>
        <Pill variant="sage" className="shrink-0">
          Booked
        </Pill>
      </button>

      {open ? (
        <div className="space-y-3 px-5 pb-5">
          <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
            {hasContactBits ? (
              <dl className="space-y-2.5 text-[14px]">
                {vendor.contact_email ? (
                  <div>
                    <dt className="sr-only">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${vendor.contact_email}`}
                        className="font-medium text-accent hover:opacity-80"
                      >
                        {vendor.contact_email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {vendor.contact_phone ? (
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <a
                        href={`tel:${vendor.contact_phone}`}
                        className="font-medium text-accent hover:opacity-80"
                      >
                        {vendor.contact_phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {vendor.address ? (
                  <div>
                    <dt className="sr-only">Address</dt>
                    <dd className="font-medium text-ink">{vendor.address}</dd>
                  </div>
                ) : null}
                {vendor.website ? (
                  <div>
                    <dt className="sr-only">Website</dt>
                    <dd>
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent hover:opacity-80"
                      >
                        Website
                      </a>
                    </dd>
                  </div>
                ) : null}
                {vendor.quoted_price != null ? (
                  <div>
                    <dt className="sr-only">Quoted price</dt>
                    <dd className="font-medium tabular-nums text-ink">
                      {formatMoney(vendor.quoted_price)}
                    </dd>
                  </div>
                ) : null}
                {vendor.notes ? (
                  <div>
                    <dt className="sr-only">Notes</dt>
                    <dd className="line-clamp-1 text-[13px] text-muted">
                      {vendor.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {thinRecord ? (
              <p className="text-[13px] text-muted">
                <Link
                  href={detailHref}
                  className="font-medium text-accent hover:opacity-80"
                >
                  Add phone or address
                </Link>
              </p>
            ) : null}

            {pkg.slots
              .filter((s) => s.note)
              .map((s) => (
                <p key={s.id} className="mt-2 text-[13px] text-muted">
                  {vendorCategoryLabel(s.category)}: {s.note}
                </p>
              ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Link
              href={detailHref}
              className="text-[14px] font-semibold text-accent hover:opacity-80"
            >
              View details
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={isPending}
                onClick={handleUnbook}
                className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? "Unbooking…" : "Unbook"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRemove}
                className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/** Recessed slot well — not a vendor card. */
function EmptyBookedSlotCard({
  projectId,
  slot,
  connectableVendors,
}: {
  projectId: string;
  slot: EmptyBookedSlot;
  connectableVendors: ConnectableBookedVendor[];
}) {
  const categoryLabel = vendorCategoryLabel(slot.category);
  const addHref = `/projects/${projectId}/vendors?category=${encodeURIComponent(slot.category)}#add-vendor`;

  return (
    <article className="overflow-hidden rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[15px] font-medium text-ink">
          {categoryLabel}
        </p>
        <Pill variant="sage" className="shrink-0">
          Booked
        </Pill>
      </div>
      <p className="mt-1 text-[13px] text-muted">Booked · vendor not recorded</p>
      {slot.note ? (
        <p className="mt-2 text-[13px] text-muted">{slot.note}</p>
      ) : null}
      <div className="mt-3 flex flex-col items-start gap-2">
        <ConnectExistingVendorControl
          targetId={slot.id}
          vendors={connectableVendors}
        />
        <Link
          href={addHref}
          className="text-[13px] font-medium text-accent hover:opacity-80"
        >
          Add new
        </Link>
      </div>
    </article>
  );
}

function UnslottedBookedCard({
  projectId,
  item,
  slotTargets,
}: {
  projectId: string;
  item: UnslottedBookedVendor;
  slotTargets: SlotTargetOption[];
}) {
  const detailHref = `/projects/${projectId}/vendors/${item.vendorId}`;

  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] bg-surface px-5 py-4 shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={detailHref}
            className="block text-[15px] font-medium leading-snug text-ink break-words hover:text-accent"
          >
            {item.name}
          </Link>
          <p className="mt-2 text-[13px] text-muted">Not linked to a category</p>
        </div>
        <Pill variant="sage" className="shrink-0">
          Booked
        </Pill>
      </div>
      <div className="mt-3">
        <LinkVendorToTargetControl
          projectVendorId={item.projectVendorId}
          vendorCategory={item.category}
          targets={slotTargets}
        />
      </div>
    </article>
  );
}

export function BookedVendorsSection({
  projectId,
  packages = [],
  emptySlots = [],
  unslotted = [],
  slotTargets = [],
  connectableVendors = [],
}: {
  projectId: string;
  packages?: BookedPackage[];
  emptySlots?: EmptyBookedSlot[];
  unslotted?: UnslottedBookedVendor[];
  slotTargets?: SlotTargetOption[];
  connectableVendors?: ConnectableBookedVendor[];
}) {
  if (
    packages.length === 0 &&
    emptySlots.length === 0 &&
    unslotted.length === 0
  ) {
    return null;
  }

  const hasVendorCards = packages.length > 0 || unslotted.length > 0;

  return (
    <section className="space-y-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Booked
      </p>

      {hasVendorCards ? (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {packages.map((pkg) => (
            <BookedPackageCard
              key={pkg.projectVendorId}
              projectId={projectId}
              pkg={pkg}
            />
          ))}
          {unslotted.map((item) => (
            <UnslottedBookedCard
              key={item.projectVendorId}
              projectId={projectId}
              item={item}
              slotTargets={slotTargets}
            />
          ))}
        </div>
      ) : null}

      {emptySlots.length > 0 ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {emptySlots.map((slot) => (
            <EmptyBookedSlotCard
              key={slot.id}
              projectId={projectId}
              slot={slot}
              connectableVendors={connectableVendors}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
