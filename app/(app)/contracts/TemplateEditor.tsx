"use client";

import { useRef, useState, useTransition } from "react";
import {
  createContractTemplate,
  updateContractTemplate,
  type ContractTemplateRow,
} from "./template-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTRACT_TEMPLATE_TOKENS } from "@/lib/contract-template-tokens";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";

export function TemplateEditor({
  initial,
  seed,
  onCancel,
  onSaved,
}: {
  initial?: ContractTemplateRow | null;
  /** Prefill for create (e.g. assistant draft). Ignored when editing. */
  seed?: { name: string; body: string } | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? seed?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? seed?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        body,
        category: category === "" ? null : category,
      };
      const result = initial
        ? await updateContractTemplate(initial.id, payload)
        : await createContractTemplate(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {initial ? "Edit template" : "New template"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Plain text with merge tokens. Click a token to insert it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-2 text-[13px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[13px] font-medium text-muted">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Photographer Agreement"
            disabled={isPending}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Category</span>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isPending}
            aria-label="Template category"
          >
            <option value="">None</option>
            {VENDOR_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">Merge tokens</p>
        <div className="flex flex-wrap gap-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed">
          {CONTRACT_TEMPLATE_TOKENS.map(({ token, label }) => (
            <button
              key={token}
              type="button"
              disabled={isPending}
              onClick={() => insertToken(token)}
              className="cursor-pointer rounded-[var(--radius-pill)] border border-ring bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              title={token}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Body</span>
        <Textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          disabled={isPending}
          placeholder="This agreement is between {{business_name}} and {{couple_name}} for the wedding on {{wedding_date}}…"
          className="min-h-[280px] font-medium leading-relaxed"
        />
      </label>

      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
    </Card>
  );
}
