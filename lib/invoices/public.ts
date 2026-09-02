import "server-only";

import { parseMoney } from "@/lib/invoices/money";
import type { PublicInvoice, PublicInvoiceLineItem } from "@/lib/invoices/types";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/invoices/types";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

function asStatus(value: unknown): InvoiceStatus | null {
  if (typeof value !== "string") return null;
  return (INVOICE_STATUSES as readonly string[]).includes(value)
    ? (value as InvoiceStatus)
    : null;
}

function asLineItems(value: unknown): PublicInvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      if (typeof item.description !== "string") return null;
      return {
        description: item.description,
        amount: parseMoney(item.amount),
        sort_order: typeof item.sort_order === "number" ? item.sort_order : 0,
      };
    })
    .filter((item): item is PublicInvoiceLineItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getPublicInvoiceByToken(
  token: string,
): Promise<PublicInvoice | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("get_invoice_by_token", {
    p_token: trimmed,
  });

  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.invoice_found !== true) return null;

  const status = asStatus(row.status);
  if (!status) return null;

  return {
    client_name: typeof row.client_name === "string" ? row.client_name : null,
    status,
    issue_date: typeof row.issue_date === "string" ? row.issue_date : "",
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    payment_link_url:
      typeof row.payment_link_url === "string" ? row.payment_link_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    total: parseMoney(row.total),
    line_items: asLineItems(row.line_items),
  };
}
