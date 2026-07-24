"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { unlinkVendorFromTarget } from "@/app/(app)/projects/[projectId]/vendors/actions";
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

export type BookedSlot = {
  id: string;
  category: string;
  note: string | null;
  vendor: BookedSlotVendor | null;
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

function BookedSlotCard({
  projectId,
  slot,
}: {
  projectId: string;
  slot: BookedSlot;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const categoryLabel = vendorCategoryLabel(slot.category);
  const vendor = slot.vendor;
  const detailHref = vendor
    ? `/projects/${projectId}/vendors/${vendor.vendorId}`
    : null;
  const addHref = `/projects/${projectId}/vendors?category=${encodeURIComponent(slot.category)}#add-vendor`;

  const hasContactBits = Boolean(
    vendor &&
      (vendor.contact_email ||
        vendor.contact_phone ||
        vendor.address ||
        vendor.website ||
        vendor.quoted_price != null ||
        vendor.notes),
  );
  const thinRecord = vendor != null && !hasContactBits;

  function handleUnbook() {
    startTransition(async () => {
      await unlinkVendorFromTarget(slot.id);
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
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {categoryLabel}
          </p>
          {vendor ? (
            <p className="mt-1 truncate text-[15px] font-medium text-ink">
              {vendor.name}
            </p>
          ) : (
            <p className="mt-1 truncate text-[15px] font-medium text-ink">
              {categoryLabel}
            </p>
          )}
        </div>
        <Pill variant="sage" className="shrink-0">
          Booked
        </Pill>
      </button>

      {open ? (
        <div className="space-y-3 px-5 pb-5">
          <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
            {vendor && hasContactBits ? (
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

            {thinRecord && detailHref ? (
              <p className="text-[13px] text-muted">
                <Link
                  href={detailHref}
                  className="font-medium text-accent hover:opacity-80"
                >
                  Add phone or address
                </Link>
              </p>
            ) : null}

            {!vendor ? (
              <p className="text-[13px] text-muted">
                No vendor details yet —{" "}
                <Link
                  href={addHref}
                  className="font-medium text-accent hover:opacity-80"
                >
                  add them
                </Link>
              </p>
            ) : null}

            {slot.note ? (
              <p className="mt-2 text-[13px] text-muted">{slot.note}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {detailHref ? (
              <Link
                href={detailHref}
                className="text-[14px] font-semibold text-accent hover:opacity-80"
              >
                View details
              </Link>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={handleUnbook}
              className="rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50"
            >
              {isPending ? "Unbooking…" : "Unbook"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function UnslottedBookedCard({
  projectId,
  item,
  slotTargets,
}: {
  projectId: string;
  item: UnslottedBookedVendor;
  slotTargets: SlotTargetOption[];
}) {
  const categoryLabel = item.category
    ? vendorCategoryLabel(item.category)
    : "Uncategorized";

  return (
    <article className="overflow-hidden rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {categoryLabel}
          </p>
          <Link
            href={`/projects/${projectId}/vendors/${item.vendorId}`}
            className="mt-1 block truncate text-[15px] font-medium text-ink hover:text-accent"
          >
            {item.name}
          </Link>
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
  slots,
  unslotted = [],
  slotTargets = [],
}: {
  projectId: string;
  slots: BookedSlot[];
  unslotted?: UnslottedBookedVendor[];
  slotTargets?: SlotTargetOption[];
}) {
  if (slots.length === 0 && unslotted.length === 0) return null;

  return (
    <section className="space-y-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Booked
      </p>
      {slots.length > 0 ? (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {slots.map((slot) => (
            <BookedSlotCard key={slot.id} projectId={projectId} slot={slot} />
          ))}
        </div>
      ) : null}

      {unslotted.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Booked · no category slot ({unslotted.length})
          </p>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {unslotted.map((item) => (
              <UnslottedBookedCard
                key={item.projectVendorId}
                projectId={projectId}
                item={item}
                slotTargets={slotTargets}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
