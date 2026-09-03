"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_PLATFORMS,
  CONTENT_TYPE_META,
  type ContentPlatform,
  type ContentType,
} from "@/lib/admin/platforms";
import type { ContentBankItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useMemo, useState, useTransition } from "react";
import {
  createBankItem,
  deleteBankItem,
  updateBankItem,
  type BankItemInput,
} from "@/app/(admin)/admin/bank/actions";

const EMPTY_FORM: BankItemInput = {
  platform: "tiktok",
  idea: "",
  type: null,
  format: null,
  title: null,
  body: "",
  notes: null,
};

function platformMeta(key: ContentPlatform) {
  return CONTENT_PLATFORMS.find((p) => p.key === key)!;
}

function BankForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: BankItemInput;
  onCancel: () => void;
  onSubmit: (input: BankItemInput) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<BankItemInput>(initial);
  const meta = platformMeta(form.platform);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <h2 id="bank-form-title" className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
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
          {CONTENT_PLATFORMS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
          Idea
        </label>
        <Input
          value={form.idea}
          onChange={(e) => setForm((f) => ({ ...f, idea: e.target.value }))}
          placeholder="One-line hook or topic"
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
          Notes
        </label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
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

export function ContentBankBoard({ items }: { items: ContentBankItem[] }) {
  const [localItems, setLocalItems] = useState(items);
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [editing, setEditing] = useState<ContentBankItem | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      platformFilter === "all"
        ? localItems
        : localItems.filter((i) => i.platform === platformFilter),
    [localItems, platformFilter],
  );

  function handleSubmit(input: BankItemInput) {
    if (editing === "new" || editing === null) {
      startTransition(async () => {
        await createBankItem(input);
        setEditing(null);
      });
    } else {
      const id = editing.id;
      setLocalItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
      );
      startTransition(async () => {
        await updateBankItem(id, input);
        setEditing(null);
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
          <button
            type="button"
            onClick={() => setPlatformFilter("all")}
            className={cn(
              "rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[14px] font-medium",
              platformFilter === "all"
                ? "border-ink bg-ink text-surface font-semibold"
                : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
            )}
          >
            All ({localItems.length})
          </button>
          {CONTENT_PLATFORMS.map((p) => {
            const count = localItems.filter((i) => i.platform === p.key).length;
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
            const meta = platformMeta(item.platform);
            return (
              <Card
                key={item.id}
                className="cursor-pointer px-5 py-4 transition-colors hover:shadow-card-emotional"
                onClick={() => setEditing(item)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Pill variant="default">{meta.label}</Pill>
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
                {item.notes ? (
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

      {editing !== null ? (
        <Modal onClose={() => setEditing(null)} labelledBy="bank-form-title">
          <BankForm
            initial={
              editing === "new"
                ? EMPTY_FORM
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
