"use client";

import {
  createBankItem,
  deleteBankItem,
  getContentBankDownloadUrl,
  updateBankItem,
  type BankItemInput,
} from "@/app/(admin)/admin/bank/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatLabel,
  formatNeedsImages,
  isContentPostFormat,
  queueNoImageCopy,
} from "@/lib/admin/content-formats";
import {
  itemInAudienceBank,
  type AudienceGroup,
} from "@/lib/admin/platform-audience";
import {
  CONTENT_PLATFORMS,
  CONTENT_TYPE_META,
  type ContentPlatform,
  type ContentType,
} from "@/lib/admin/platforms";
import type { ContentBankItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useMemo, useState, useTransition } from "react";

function emptyForm(platform: ContentPlatform): Omit<BankItemInput, "audience_group"> {
  return {
    platform,
    idea: "",
    type: null,
    format: null,
    title: null,
    body: "",
    notes: null,
  };
}

function platformMeta(key: ContentPlatform) {
  return CONTENT_PLATFORMS.find((p) => p.key === key)!;
}

function bankAspect(platform: ContentPlatform) {
  if (platform === "tiktok") return "aspect-[9/16]";
  if (platform === "pinterest") return "aspect-[2/3]";
  return "aspect-[4/5]";
}

function BankForm({
  initial,
  platforms,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: Omit<BankItemInput, "audience_group">;
  platforms: ContentPlatform[];
  onCancel: () => void;
  onSubmit: (input: Omit<BankItemInput, "audience_group">) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState(initial);
  const meta = platformMeta(form.platform);
  const isReddit = form.platform === "reddit";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <h2 id="bank-form-title" className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        {initial.idea ? "Edit idea" : "New idea"}
      </h2>

      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Platform
        </label>
        <Select
          value={form.platform}
          onChange={(e) =>
            setForm((f) => ({ ...f, platform: e.target.value as ContentPlatform }))
          }
        >
          {platforms.map((key) => {
            const p = platformMeta(key);
            return (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            );
          })}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          {isReddit ? "Thread title" : "Idea"}
        </label>
        <Input
          value={form.idea}
          onChange={(e) => setForm((f) => ({ ...f, idea: e.target.value }))}
          placeholder={isReddit ? "Thread title or topic" : "One-line hook or topic"}
          required
        />
      </div>

      {meta.usesType ? (
        <div>
          <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Type
          </label>
          <Select
            value={form.type ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: (e.target.value || null) as ContentType | null,
              }))
            }
          >
            <option value="">— none —</option>
            {(Object.keys(CONTENT_TYPE_META) as ContentType[]).map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_META[t].label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {meta.usesFormat ? (
        <div>
          <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Format
          </label>
          <Input
            value={form.format ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, format: e.target.value || null }))}
            placeholder="Reel, carousel, static post…"
          />
        </div>
      ) : null}

      {meta.usesTitle ? (
        <div>
          <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Pin title
          </label>
          <Input
            value={form.title ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value || null }))}
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          {meta.bodyLabel}
        </label>
        <Textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={6}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          {isReddit ? "Subreddit" : "Notes"}
        </label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          placeholder={isReddit ? "r/weddingplanning" : undefined}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="default" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save idea"}
        </Button>
      </div>
    </form>
  );
}

function QueueSourcedCard({
  item,
  onDelete,
}: {
  item: ContentBankItem;
  onDelete: (id: string) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const meta = platformMeta(item.platform);
  const urls = item.image_urls ?? [];
  const count = urls.length;
  const formatText = isContentPostFormat(item.format)
    ? formatLabel(item.format)
    : item.format;

  function handleCopy() {
    if (!item.body) return;
    void navigator.clipboard.writeText(item.body).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownload() {
    startTransition(async () => {
      const url = await getContentBankDownloadUrl(item.id, imageIndex);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Card className="px-5 py-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Pill variant="default">{meta.label}</Pill>
        {formatText ? <Pill variant="default">{formatText}</Pill> : null}
        <Pill variant="sage">From queue</Pill>
      </div>

      {count === 0 ? (
        <div
          className={cn(
            "mb-3 flex items-center justify-center rounded-[var(--radius-inner)] bg-well shadow-recessed",
            bankAspect(item.platform),
          )}
        >
          <p className="px-3 text-center text-[13px] text-muted">
            {isContentPostFormat(item.format) && !formatNeedsImages(item.format)
              ? queueNoImageCopy(item.format)
              : "No image on file"}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "relative mb-3 overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed",
            bankAspect(item.platform),
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          <img src={urls[Math.min(imageIndex, count - 1)]} alt="" className="size-full object-cover" />
          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setImageIndex((imageIndex - 1 + count) % count)}
                className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-surface/90 text-[15px] font-semibold text-ink"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setImageIndex((imageIndex + 1) % count)}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-surface/90 text-[15px] font-semibold text-ink"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      )}

      <div className="mb-1 text-[15px] font-medium text-ink">{item.idea}</div>
      <p className="line-clamp-3 text-[13px] text-muted">{item.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="text-[13px] font-medium text-accent hover:underline"
        >
          {copied ? "Copied" : "Copy caption"}
        </button>
        {count > 0 ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDownload}
            className="text-[13px] font-medium text-accent hover:underline disabled:opacity-50"
          >
            Download
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="ml-auto text-[13px] font-medium text-rosewood hover:underline"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

export function ContentBankBoard({
  items,
  platforms,
  audience,
}: {
  items: ContentBankItem[];
  platforms: ContentPlatform[];
  audience: AudienceGroup;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform>(platforms[0]!);
  const [editing, setEditing] = useState<ContentBankItem | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const scopedItems = useMemo(
    () =>
      localItems.filter(
        (i) => itemInAudienceBank(i, audience) && platforms.includes(i.platform),
      ),
    [localItems, platforms, audience],
  );

  const filtered = useMemo(
    () => scopedItems.filter((i) => i.platform === platformFilter),
    [scopedItems, platformFilter],
  );

  function handleSubmit(input: Omit<BankItemInput, "audience_group">) {
    const payload: BankItemInput = { ...input, audience_group: audience };
    if (editing === "new" || editing === null) {
      const temp: ContentBankItem = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        audience_group: audience,
        source_queue_id: null,
        image_paths: [],
        image_urls: [],
        ...input,
      };
      setLocalItems((prev) => [temp, ...prev]);
      setEditing(null);
      startTransition(async () => {
        await createBankItem(payload);
      });
    } else {
      const id = editing.id;
      setLocalItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
      );
      setEditing(null);
      startTransition(async () => {
        await updateBankItem(id, input);
      });
    }
  }

  function handleDelete(id: string) {
    setLocalItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteBankItem(id);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {platforms.map((key) => {
            const p = platformMeta(key);
            const count = scopedItems.filter((i) => i.platform === p.key).length;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlatformFilter(p.key)}
                className={cn(
                  "rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[14px] font-medium",
                  platformFilter === p.key
                    ? "border-ink bg-ink text-surface font-semibold"
                    : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
                )}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>
          + New idea
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No ideas in the bank yet for this platform.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((item) => {
            if (item.source_queue_id) {
              return (
                <QueueSourcedCard key={item.id} item={item} onDelete={handleDelete} />
              );
            }
            const meta = platformMeta(item.platform);
            return (
              <Card
                key={item.id}
                className="cursor-pointer px-5 py-4 transition-colors"
                onClick={() => setEditing(item)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill variant="default">{meta.label}</Pill>
                    {item.platform === "reddit" && item.notes ? (
                      <Pill variant="default">{item.notes}</Pill>
                    ) : null}
                  </div>
                  {item.type ? (
                    <Pill variant={CONTENT_TYPE_META[item.type].pill}>
                      {CONTENT_TYPE_META[item.type].label}
                    </Pill>
                  ) : null}
                </div>
                <div className="mb-1 text-[15px] font-medium text-ink">{item.idea}</div>
                {item.title ? (
                  <div className="mb-1 text-[14px] font-medium text-accent">{item.title}</div>
                ) : null}
                <p className="line-clamp-3 text-[13px] text-muted">{item.body}</p>
                {item.platform !== "reddit" && item.notes ? (
                  <p className="mt-2 text-[13px] text-muted italic">{item.notes}</p>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="mt-3 text-[13px] font-medium text-rosewood hover:underline"
                >
                  Delete
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {editing !== null && (editing === "new" || !editing.source_queue_id) ? (
        <Modal onClose={() => setEditing(null)} labelledBy="bank-form-title">
          <BankForm
            platforms={platforms}
            initial={
              editing === "new"
                ? emptyForm(platformFilter)
                : {
                    platform: editing.platform,
                    idea: editing.idea,
                    type: editing.type,
                    format: editing.format,
                    title: editing.title,
                    body: editing.body,
                    notes: editing.notes,
                  }
            }
            onCancel={() => setEditing(null)}
            onSubmit={handleSubmit}
            submitting={isPending}
          />
        </Modal>
      ) : null}
    </div>
  );
}
