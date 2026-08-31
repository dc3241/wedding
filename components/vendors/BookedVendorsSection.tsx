"use client";

import Link from "next/link";
import { useRef, useState, useTransition, useEffect } from "react";
import {
  addBudgetItem,
  setBudgetItemProjectVendor,
  updateBudgetItem,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import {
  unlinkVendorFromTarget,
  removeProjectVendor,
  updateProjectVendorDayOf,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import {
  PaymentLedgerWell,
  PaymentScheduleWell,
} from "@/components/budget/BudgetMoneyWells";
import {
  ConnectExistingVendorControl,
  type ConnectableBookedVendor,
} from "@/components/vendors/ConnectExistingVendorControl";
import {
  LinkVendorToTargetControl,
  type SlotTargetOption,
} from "@/components/vendors/LinkVendorToTargetControl";
import {
  deleteFile,
  getDownloadUrl,
  recordFile,
} from "@/components/files/actions";
import {
  buildStoragePath,
  FILE_INPUT_ACCEPT,
  formatFileSize,
  PROJECT_FILES_BUCKET,
  resolveMimeType,
  validateFile,
} from "@/components/files/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { budgetItemDisplayName } from "@/lib/booked-vendor-money";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format-currency";
import { vendorConfirmUrl } from "@/lib/vendors/confirm-url";
import {
  vendorCategoryLabel,
} from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/client";
import type {
  BudgetPaymentForAggregate,
  NextDueInstallment,
  ScheduleInstallmentForAggregate,
} from "@/lib/budget-aggregates";

export type BookedLinkableItem = {
  id: string;
  category: string | null;
  label: string | null;
  project_vendor_id: string | null;
  linkedVendorName?: string | null;
};

export type BookedContractFile = {
  id: string;
  name: string;
  size_bytes: number | null;
  created_at: string;
};

export type BookedLinkedItemSummary = {
  id: string;
  category: string | null;
  label: string | null;
  actual_amount: number | null;
  notes: string | null;
  paid: number;
  payments: BudgetPaymentForAggregate[];
  schedule: ScheduleInstallmentForAggregate[];
  nextDue: NextDueInstallment | null;
  pastDue: boolean;
};

/** One raised card per booked project_vendor — may cover many category slots. */
export type BookedVendorObject = {
  projectVendorId: string;
  vendorId: string;
  name: string;
  category: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  slots: { id: string; category: string; note: string | null }[];
  linkedItems: BookedLinkedItemSummary[];
  price: number | null;
  paid: number | null;
  nextDue: NextDueInstallment | null;
  pastDue: boolean | null;
  notes: string | null;
  arrival_time: string | null;
  scope_note: string | null;
  confirm_token: string;
  confirmed_at: string | null;
  contracts: BookedContractFile[];
};

/** Booked category with no vendor recorded yet. */
export type EmptyBookedSlot = {
  id: string;
  category: string;
  note: string | null;
};

const destructiveControlClass =
  "rounded-[var(--radius-inner)] px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:pointer-events-none disabled:opacity-50";

function formatLocalDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function MoneySummary({
  price,
  paid,
  nextDue,
  pastDue,
}: {
  price: number | null;
  paid: number | null;
  nextDue: NextDueInstallment | null;
  pastDue: boolean | null;
}) {
  if (paid === null) {
    return (
      <p className="text-[13px] text-muted">Not linked to a budget item</p>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-3 text-[13px]">
      <div>
        <dt className="text-muted">Actual</dt>
        <dd className="mt-0.5 tabnum font-medium text-ink">
          {price == null ? "—" : formatCurrency(price)}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Paid</dt>
        <dd className="mt-0.5 tabnum font-medium text-ink">
          {formatCurrency(paid)}
        </dd>
      </div>
      <div>
        <dt className="text-muted">Next due</dt>
        <dd
          className={cn(
            "mt-0.5 tabnum font-medium",
            pastDue ? "text-rosewood" : nextDue ? "text-sage" : "text-ink",
          )}
        >
          {nextDue == null ? (
            "—"
          ) : (
            <>
              {formatCurrency(nextDue.amount)}
              <span className="mt-0.5 block text-[12px] font-normal text-muted">
                {formatLocalDate(nextDue.due_on)}
                {pastDue ? " · past due" : ""}
              </span>
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}

function LinkBudgetItemControl({
  projectId,
  projectVendorId,
  vendorName,
  vendorCategory,
  linkableItems,
}: {
  projectId: string;
  projectVendorId: string;
  vendorName: string;
  vendorCategory: string | null;
  linkableItems: BookedLinkableItem[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  const vendorCatLabel = vendorCategory
    ? vendorCategoryLabel(vendorCategory)
    : null;

  const matching = linkableItems.filter(
    (i) =>
      vendorCatLabel &&
      i.category?.trim().toLowerCase() === vendorCatLabel.toLowerCase(),
  );
  const others = linkableItems.filter(
    (i) => !matching.some((m) => m.id === i.id),
  );
  const ordered = [...matching, ...others];

  function handleLink() {
    if (!selectedId) {
      setError("Choose a budget item.");
      return;
    }
    const target = linkableItems.find((i) => i.id === selectedId);
    if (
      target?.project_vendor_id != null &&
      target.project_vendor_id !== projectVendorId
    ) {
      const ok = window.confirm(
        `That item is linked to ${target.linkedVendorName ?? "another vendor"}. Replace the link?`,
      );
      if (!ok) return;
    }

    startTransition(async () => {
      setError(null);
      const result = await setBudgetItemProjectVendor(
        selectedId,
        projectVendorId,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setSelectedId("");
    });
  }

  function handleCreateAndLink() {
    const category =
      vendorCatLabel?.trim() ||
      (vendorCategory ? vendorCategoryLabel(vendorCategory) : "Vendor");
    startTransition(async () => {
      setError(null);
      try {
        const created = await addBudgetItem(
          projectId,
          category,
          vendorName,
          0,
        );
        const result = await setBudgetItemProjectVendor(
          created.id,
          projectVendorId,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not create budget item.",
        );
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="primary"
        className="text-[13px]"
        onClick={() => setOpen(true)}
      >
        Link to budget item
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <p className="text-[13px] font-medium text-ink">Link to a budget item</p>
      <Select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={isPending}
        aria-label="Budget item"
      >
        <option value="">Choose item…</option>
        {ordered.map((item) => (
          <option key={item.id} value={item.id}>
            {budgetItemDisplayName(item)}
            {item.project_vendor_id &&
            item.project_vendor_id !== projectVendorId
              ? ` · linked to ${item.linkedVendorName ?? "vendor"}`
              : ""}
          </option>
        ))}
      </Select>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={isPending || !selectedId}
          onClick={handleLink}
          className="text-[13px]"
        >
          {isPending ? "Linking…" : "Link"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleCreateAndLink}
          className="text-[13px]"
        >
          Create + link new item
        </Button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="px-2 text-[13px] font-medium text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-rosewood">{error}</p>
      ) : null}
    </div>
  );
}

function LinkedItemsPanel({
  projectId,
  items,
}: {
  projectId: string;
  items: BookedLinkedItemSummary[];
}) {
  const [isPending, startTransition] = useTransition();
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const multi = items.length > 1;

  function handleUnlink(itemId: string) {
    startTransition(async () => {
      await setBudgetItemProjectVendor(itemId, null);
    });
  }

  function handleSavePrice(itemId: string, current: number | null) {
    const raw = priceDrafts[itemId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    const next =
      trimmed === "" ? null : Math.max(0, Number(trimmed));
    if (trimmed !== "" && Number.isNaN(next as number)) return;
    if (next === current) return;
    startTransition(async () => {
      await updateBudgetItem(itemId, { actual_amount: next });
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    });
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const draft =
          priceDrafts[item.id] ??
          (item.actual_amount != null && item.actual_amount !== 0
            ? String(item.actual_amount)
            : "");
        const wellItem = {
          id: item.id,
          schedule: item.schedule,
          payments: item.payments,
        };
        return (
          <li
            key={item.id}
            className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">
                  {budgetItemDisplayName(item)}
                </p>
                {multi ? (
                  <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                    Actual{" "}
                    {item.actual_amount == null
                      ? "—"
                      : formatCurrency(item.actual_amount)}
                    {" · "}
                    Paid {formatCurrency(item.paid)}
                  </p>
                ) : null}
                {item.notes?.trim() ? (
                  <p className="mt-1 text-[13px] text-muted">{item.notes}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleUnlink(item.id)}
                className={destructiveControlClass}
              >
                Unlink
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <span className="shrink-0">Actual</span>
              <div className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded-[var(--radius-inner)] border border-ring bg-surface px-2">
                <span aria-hidden>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft}
                  disabled={isPending}
                  onChange={(e) =>
                    setPriceDrafts((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleSavePrice(item.id, item.actual_amount)}
                  aria-label={`Actual for ${budgetItemDisplayName(item)}`}
                  className="min-w-0 w-full flex-1 border-0 bg-transparent text-right text-[14px] font-medium tabular-nums text-ink outline-none"
                />
              </div>
            </label>

            <PaymentScheduleWell projectId={projectId} item={wellItem} />
            <PaymentLedgerWell projectId={projectId} item={wellItem} />
          </li>
        );
      })}
    </ul>
  );
}

function ContractPanel({
  projectId,
  projectVendorId,
  contracts,
  defaultCategory,
}: {
  projectId: string;
  projectVendorId: string;
  contracts: BookedContractFile[];
  defaultCategory: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const mimeType = resolveMimeType(file)!;
    const storagePath = buildStoragePath(projectId, file.name);

    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PROJECT_FILES_BUCKET)
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: false,
        });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      try {
        await recordFile(projectId, {
          name: file.name,
          storagePath,
          mimeType,
          sizeBytes: file.size,
          kind: "contract",
          category: defaultCategory,
          projectVendorId,
        });
      } catch (err) {
        await supabase.storage.from(PROJECT_FILES_BUCKET).remove([storagePath]);
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  function handleDownload(fileId: string) {
    startTransition(async () => {
      setError(null);
      const result = await getDownloadUrl(fileId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete(fileId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      setError(null);
      try {
        await deleteFile(fileId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Contract
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={FILE_INPUT_ACCEPT}
            className="sr-only"
            onChange={handleUpload}
            disabled={isPending}
          />
          <Button
            type="button"
            variant="secondary"
            className="text-[13px]"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? "Working…" : "Upload"}
          </Button>
        </div>
      </div>
      {contracts.length === 0 ? (
        <p className="text-[13px] text-muted">No contract uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {contracts.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-well px-3 py-2.5 shadow-recessed"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {file.name}
                </p>
                <p className="text-[12px] text-muted">
                  {formatFileSize(file.size_bytes)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDownload(file.id)}
                  className="rounded-[var(--radius-inner)] px-2 py-1 text-[13px] font-semibold text-accent hover:opacity-80 disabled:opacity-50"
                >
                  View
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(file.id, file.name)}
                  className={destructiveControlClass}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p className="text-[13px] font-medium text-rosewood">{error}</p>
      ) : null}
    </div>
  );
}

function ArrivalScopeEditor({
  projectVendorId,
  arrivalTime,
  scopeNote,
  confirmToken,
}: {
  projectVendorId: string;
  arrivalTime: string | null;
  scopeNote: string | null;
  confirmToken: string;
}) {
  const [arrival, setArrival] = useState(arrivalTime?.slice(0, 5) ?? "");
  const [scope, setScope] = useState(scopeNote ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setArrival(arrivalTime?.slice(0, 5) ?? "");
    setScope(scopeNote ?? "");
  }, [arrivalTime, scopeNote]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function handleSave(next?: { arrival?: string; scope?: string }) {
    const arrivalValue = next?.arrival ?? arrival;
    const scopeValue = next?.scope ?? scope;
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const result = await updateProjectVendorDayOf(projectVendorId, {
        arrival_time: arrivalValue,
        scope_note: scopeValue,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  async function handleCopyConfirmLink() {
    try {
      await navigator.clipboard.writeText(vendorConfirmUrl(confirmToken));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Day-of
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <label className="block text-[13px] font-medium text-muted">
          Arrival
          <Input
            type="time"
            value={arrival}
            disabled={isPending}
            onChange={(e) => {
              setArrival(e.target.value);
              setSaved(false);
            }}
            onBlur={(e) => handleSave({ arrival: e.target.value })}
            className="mt-1 bg-surface py-2"
          />
        </label>
        <label className="block text-[13px] font-medium text-muted">
          Scope
          <Textarea
            rows={2}
            value={scope}
            disabled={isPending}
            onChange={(e) => {
              setScope(e.target.value);
              setSaved(false);
            }}
            onBlur={(e) => handleSave({ scope: e.target.value })}
            placeholder="Ceremony, portraits, reception"
            className="mt-1 bg-surface py-2 text-[14px]"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="default"
          onClick={handleCopyConfirmLink}
          className="px-3 py-1.5 text-[13px]"
        >
          {copied ? "Copied" : "Copy confirm link"}
        </Button>
        {saved ? <p className="text-[13px] text-sage">Saved</p> : null}
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-rosewood">{error}</p>
      ) : null}
    </div>
  );
}

function BookedVendorCard({
  projectId,
  vendor,
  linkableItems,
  slotTargets,
}: {
  projectId: string;
  vendor: BookedVendorObject;
  linkableItems: BookedLinkableItem[];
  slotTargets: SlotTargetOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const detailHref = `/projects/${projectId}/vendors/${vendor.vendorId}`;
  const categoryIds = vendor.slots.map((s) => s.category);
  const linked = vendor.linkedItems.length > 0;

  function handleUnbook() {
    startTransition(async () => {
      for (const slot of vendor.slots) {
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
      await removeProjectVendor(vendor.projectVendorId);
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised",
        open && "sm:col-span-full",
        isPending && "opacity-60",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[15px] font-medium leading-snug text-ink break-words">
            {vendor.name}
          </p>
          {vendor.contact_phone ? (
            <p className="text-[13px] text-muted">{vendor.contact_phone}</p>
          ) : null}
          <CategoryChips categories={categoryIds} />
          <MoneySummary
            price={vendor.price}
            paid={vendor.paid}
            nextDue={vendor.nextDue}
            pastDue={vendor.pastDue}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {vendor.confirmed_at ? (
            <Pill variant="sage">Confirmed</Pill>
          ) : (
            <Pill variant="clay" title="Has not confirmed day-of arrival">
              Unconfirmed
            </Pill>
          )}
        </div>
      </button>

      {open ? (
        <div className="space-y-4 px-5 pb-5">
          <ArrivalScopeEditor
            projectVendorId={vendor.projectVendorId}
            arrivalTime={vendor.arrival_time}
            scopeNote={vendor.scope_note}
            confirmToken={vendor.confirm_token}
          />
          {!linked ? (
            <div className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
              <p className="text-[14px] font-medium text-ink">
                Not linked to a budget item
              </p>
              <p className="text-[13px] text-muted">
                Link an existing line — or create one — so Actual, Paid, and due
                dates read through from the budget.
              </p>
              <LinkBudgetItemControl
                projectId={projectId}
                projectVendorId={vendor.projectVendorId}
                vendorName={vendor.name}
                vendorCategory={vendor.category}
                linkableItems={linkableItems}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Budget
                </p>
                <LinkBudgetItemControl
                  projectId={projectId}
                  projectVendorId={vendor.projectVendorId}
                  vendorName={vendor.name}
                  vendorCategory={vendor.category}
                  linkableItems={linkableItems}
                />
              </div>
              <LinkedItemsPanel
                projectId={projectId}
                items={vendor.linkedItems}
              />
              {vendor.notes ? (
                <p className="text-[13px] text-muted">{vendor.notes}</p>
              ) : null}
            </div>
          )}

          <ContractPanel
            projectId={projectId}
            projectVendorId={vendor.projectVendorId}
            contracts={vendor.contracts}
            defaultCategory={vendor.category}
          />

          {vendor.slots.length === 0 ? (
            <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
              <p className="mb-2 text-[13px] text-muted">
                Not linked to a category slot
              </p>
              <LinkVendorToTargetControl
                projectVendorId={vendor.projectVendorId}
                vendorCategory={vendor.category}
                targets={slotTargets}
              />
            </div>
          ) : null}

          {vendor.slots
            .filter((s) => s.note)
            .map((s) => (
              <p key={s.id} className="text-[13px] text-muted">
                {vendorCategoryLabel(s.category)}: {s.note}
              </p>
            ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Link
              href={detailHref}
              className="text-[14px] font-semibold text-accent hover:opacity-80"
            >
              View details
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              {vendor.slots.length > 0 ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleUnbook}
                  className={destructiveControlClass}
                >
                  Unbook
                </button>
              ) : null}
              <button
                type="button"
                disabled={isPending}
                onClick={handleRemove}
                className={destructiveControlClass}
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
  const addHref = `/projects/${projectId}/vendors?tab=outreach&category=${encodeURIComponent(slot.category)}#add-vendor`;

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
          onClick={() => {
            // Same-URL soft nav may not remount OutreachRegion; fire hashchange
            // so the add form opens (see marketing-topbar pattern).
            queueMicrotask(() => {
              if (window.location.hash !== "#add-vendor") {
                window.location.hash = "add-vendor";
              } else {
                window.dispatchEvent(new Event("hashchange"));
              }
            });
          }}
        >
          Add new
        </Link>
      </div>
    </article>
  );
}

export function BookedVendorsSection({
  projectId,
  vendors = [],
  emptySlots = [],
  slotTargets = [],
  connectableVendors = [],
  linkableItems = [],
}: {
  projectId: string;
  vendors?: BookedVendorObject[];
  emptySlots?: EmptyBookedSlot[];
  slotTargets?: SlotTargetOption[];
  connectableVendors?: ConnectableBookedVendor[];
  linkableItems?: BookedLinkableItem[];
}) {
  if (vendors.length === 0 && emptySlots.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Booked
      </p>

      {vendors.length > 0 ? (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {vendors.map((vendor) => (
            <BookedVendorCard
              key={vendor.projectVendorId}
              projectId={projectId}
              vendor={vendor}
              linkableItems={linkableItems}
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
