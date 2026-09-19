"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  emptyDraftLine,
  InvoiceLineEditor,
  toLineInputs,
  type DraftInvoiceLine,
} from "./InvoiceLineEditor";
import { createInvoice, deleteInvoiceTemplate } from "@/lib/invoices/actions";
import { invoiceLineAmount } from "@/lib/invoices/lines";
import { formatInvoiceMoney, invoiceTotal } from "@/lib/invoices/money";
import type { InvoiceTemplate } from "@/lib/invoices/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function linesFromTemplate(template: InvoiceTemplate): DraftInvoiceLine[] {
  if (template.line_items.length === 0) return [emptyDraftLine()];
  return template.line_items.map((item) => ({
    key: crypto.randomUUID(),
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    kind: item.kind,
  }));
}

export function NewInvoiceForm({
  projectId,
  templates,
}: {
  projectId: string;
  templates: InvoiceTemplate[];
}) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [lines, setLines] = useState<DraftInvoiceLine[]>([emptyDraftLine()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const liveTotal = invoiceTotal(
    lines.map((line) =>
      invoiceLineAmount(line.kind, line.quantity, line.unitPrice),
    ),
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((row) => row.id === id);
    if (!template) return;
    setNotes(template.notes ?? "");
    setTerms(template.terms ?? "");
    setLines(linesFromTemplate(template));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInvoice(projectId, {
        clientName,
        clientEmail,
        dueDate: dueDate || null,
        notes,
        terms,
        lineItems: toLineInputs(lines),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClientName("");
      setClientEmail("");
      setDueDate("");
      setNotes("");
      setTerms("");
      setTemplateId("");
      setLines([emptyDraftLine()]);
      router.push(`/projects/${projectId}/invoices/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {templates.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="invoice-template" className="text-sm font-medium text-ink">
              Start from a template
            </label>
            <Select
              id="invoice-template"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              disabled={isPending}
            >
              <option value="">Blank invoice</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>
          {templateId ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteInvoiceTemplate(templateId, projectId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setTemplateId("");
                  router.refresh();
                })
              }
              className="px-3 py-1.5 text-[13px] text-muted hover:text-rosewood"
            >
              Delete template
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="invoice-client-name" className="text-sm font-medium text-ink">
            Client name
          </label>
          <Input
            id="invoice-client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            disabled={isPending}
            placeholder="Alex & Jordan"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="invoice-client-email" className="text-sm font-medium text-ink">
            Client email
          </label>
          <Input
            id="invoice-client-email"
            type="email"
            autoComplete="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            disabled={isPending}
            placeholder="Optional — for sending"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invoice-due-date" className="text-sm font-medium text-ink">
          Due date <span className="font-normal text-muted">(optional)</span>
        </label>
        <Input
          id="invoice-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isPending}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink">Line items</p>
          <p className="text-[15px] font-medium tabular-nums text-ink">
            {formatInvoiceMoney(liveTotal)}
          </p>
        </div>
        <InvoiceLineEditor
          lines={lines}
          disabled={isPending}
          onChange={setLines}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invoice-notes" className="text-sm font-medium text-ink">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <Textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invoice-terms" className="text-sm font-medium text-ink">
          Terms <span className="font-normal text-muted">(optional)</span>
        </label>
        <Textarea
          id="invoice-terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          disabled={isPending}
          rows={3}
          placeholder="Due on receipt. Late fees after 15 days."
        />
      </div>

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}
