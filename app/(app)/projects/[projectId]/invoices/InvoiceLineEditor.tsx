"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  INVOICE_LINE_KIND_LABEL,
  INVOICE_LINE_KINDS,
  invoiceLineAmount,
  type InvoiceLineKind,
} from "@/lib/invoices/lines";
import { formatInvoiceMoney } from "@/lib/invoices/money";
import type { InvoiceLineItemInput } from "@/lib/invoices/types";

export type DraftInvoiceLine = {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  kind: InvoiceLineKind;
};

export function emptyDraftLine(kind: InvoiceLineKind = "item"): DraftInvoiceLine {
  return {
    key: crypto.randomUUID(),
    description: kind === "tax" ? "Tax" : kind === "discount" ? "Discount" : "",
    quantity: 1,
    unitPrice: 0,
    kind,
  };
}

export function toLineInputs(lines: DraftInvoiceLine[]): InvoiceLineItemInput[] {
  return lines.map(({ description, quantity, unitPrice, kind }) => ({
    description,
    quantity,
    unitPrice,
    kind,
  }));
}

export function InvoiceLineEditor({
  lines,
  disabled,
  onChange,
}: {
  lines: DraftInvoiceLine[];
  disabled?: boolean;
  onChange: (lines: DraftInvoiceLine[]) => void;
}) {
  function update(key: string, patch: Partial<DraftInvoiceLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const amount = invoiceLineAmount(line.kind, line.quantity, line.unitPrice);
        return (
          <div
            key={line.key}
            className="grid gap-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed sm:grid-cols-[minmax(0,1fr)_72px_104px_120px_auto] sm:items-center"
          >
            <Input
              aria-label={`Line ${index + 1} description`}
              value={line.description}
              onChange={(e) => update(line.key, { description: e.target.value })}
              disabled={disabled}
              placeholder={
                line.kind === "tax"
                  ? "Sales tax"
                  : line.kind === "discount"
                    ? "Discount"
                    : "Planning retainer"
              }
            />
            <Input
              aria-label={`Line ${index + 1} quantity`}
              type="number"
              min={0.01}
              step="0.01"
              value={Number.isFinite(line.quantity) ? line.quantity : 1}
              onChange={(e) =>
                update(line.key, { quantity: Number(e.target.value) })
              }
              disabled={disabled}
            />
            <Input
              aria-label={`Line ${index + 1} rate`}
              type="number"
              min={0}
              step="0.01"
              value={Number.isFinite(line.unitPrice) ? line.unitPrice : 0}
              onChange={(e) =>
                update(line.key, { unitPrice: Number(e.target.value) })
              }
              disabled={disabled}
            />
            <Select
              aria-label={`Line ${index + 1} type`}
              value={line.kind}
              onChange={(e) =>
                update(line.key, {
                  kind: (e.target.value as InvoiceLineKind) || "item",
                })
              }
              disabled={disabled}
            >
              {INVOICE_LINE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {INVOICE_LINE_KIND_LABEL[kind]}
                </option>
              ))}
            </Select>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <p className="tabular-nums text-[15px] font-medium text-ink">
                {formatInvoiceMoney(amount)}
              </p>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() =>
                    onChange(lines.filter((item) => item.key !== line.key))
                  }
                  className="px-3 py-1.5 text-[13px]"
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="default"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyDraftLine("item")])}
          className="px-3 py-1.5 text-[13px]"
        >
          Add line
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyDraftLine("tax")])}
          className="px-3 py-1.5 text-[13px]"
        >
          Add tax
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={disabled}
          onClick={() => onChange([...lines, emptyDraftLine("discount")])}
          className="px-3 py-1.5 text-[13px]"
        >
          Add discount
        </Button>
      </div>
    </div>
  );
}
