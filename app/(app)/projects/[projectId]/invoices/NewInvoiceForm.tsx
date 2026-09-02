"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInvoice } from "@/lib/invoices/actions";
import type { InvoiceLineItemInput } from "@/lib/invoices/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DraftLine = InvoiceLineItemInput & { key: string };

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), description: "", amount: 0 };
}

export function NewInvoiceForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLine(key: string, patch: Partial<InvoiceLineItemInput>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
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
        lineItems: lines.map(({ description, amount }) => ({
          description,
          amount,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClientName("");
      setClientEmail("");
      setDueDate("");
      setNotes("");
      setLines([emptyLine()]);
      router.push(`/projects/${projectId}/invoices/${result.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <p className="text-sm font-medium text-ink">Line items</p>
        {lines.map((line, index) => (
          <div key={line.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              aria-label={`Line ${index + 1} description`}
              value={line.description}
              onChange={(e) =>
                updateLine(line.key, { description: e.target.value })
              }
              disabled={isPending}
              placeholder="Planning retainer"
              className="sm:flex-1"
            />
            <Input
              aria-label={`Line ${index + 1} amount`}
              type="number"
              min={0}
              step="0.01"
              value={Number.isFinite(line.amount) ? line.amount : 0}
              onChange={(e) =>
                updateLine(line.key, { amount: Number(e.target.value) })
              }
              disabled={isPending}
              className="sm:w-32"
            />
            {lines.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  setLines((current) => current.filter((item) => item.key !== line.key))
                }
                className="px-3 py-1.5 text-[13px]"
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="default"
          disabled={isPending}
          onClick={() => setLines((current) => [...current, emptyLine()])}
          className="px-3 py-1.5 text-[13px]"
        >
          Add line
        </Button>
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
