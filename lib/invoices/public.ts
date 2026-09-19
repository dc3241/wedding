import "server-only";

import { asInvoiceLineKind, parseInvoiceQuantity } from "@/lib/invoices/lines";
import { parseMoney } from "@/lib/invoices/money";
import { deriveInvoiceSchedule } from "@/lib/invoices/schedule";
import type {
  PublicInvoice,
  PublicInvoiceLineItem,
  PublicInvoiceScheduleItem,
} from "@/lib/invoices/types";
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
      const amount = parseMoney(item.amount);
      const kind = asInvoiceLineKind(item.kind) ?? (amount < 0 ? "discount" : "item");
      const quantity = parseInvoiceQuantity(item.quantity) || 1;
      const unitPrice =
        item.unit_price != null
          ? parseMoney(item.unit_price)
          : parseMoney(Math.abs(amount) / quantity);
      return {
        description: item.description,
        quantity,
        unit_price: unitPrice,
        kind,
        amount,
        sort_order: typeof item.sort_order === "number" ? item.sort_order : 0,
      };
    })
    .filter((item): item is PublicInvoiceLineItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function asScheduleRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      if (typeof item.due_on !== "string") return null;
      const amount = parseMoney(item.amount);
      if (!(amount > 0)) return null;
      return {
        id: `s${index}`,
        amount,
        due_on: item.due_on,
        label: typeof item.label === "string" ? item.label : null,
        created_at: "",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function asBranding(row: Record<string, unknown>): PublicInvoice["branding"] {
  const brandName = typeof row.brand_name === "string" ? row.brand_name : null;
  const brandLogoUrl =
    typeof row.brand_logo_url === "string" ? row.brand_logo_url : null;
  const brandAccentColor =
    typeof row.brand_accent_color === "string" ? row.brand_accent_color : null;
  if (!brandName?.trim() && !brandLogoUrl?.trim() && !brandAccentColor?.trim()) {
    return null;
  }
  return { brandName, brandLogoUrl, brandAccentColor };
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

  const total = parseMoney(row.total);
  const collected = parseMoney(row.collected);
  const hasLedger = row.collected != null || row.remaining != null;
  const remaining = hasLedger
    ? parseMoney(row.remaining)
    : status === "paid" || status === "void"
      ? 0
      : total;

  const derived = deriveInvoiceSchedule(
    asScheduleRows(row.schedule),
    collected,
    remaining,
  );
  const schedule: PublicInvoiceScheduleItem[] = derived.schedule.map((item) => ({
    amount: item.amount,
    due_on: item.due_on,
    label: item.label,
    covered: item.covered,
    remaining: item.remaining,
  }));
  const nextDueItem = derived.nextDue
    ? derived.schedule.find((item) => item.id === derived.nextDue!.id)
    : null;
  const nextDue: PublicInvoiceScheduleItem | null = nextDueItem
    ? {
        amount: nextDueItem.amount,
        due_on: nextDueItem.due_on,
        label: nextDueItem.label,
        covered: nextDueItem.covered,
        remaining: nextDueItem.remaining,
      }
    : null;

  return {
    invoice_number:
      typeof row.invoice_number === "string" ? row.invoice_number : null,
    client_name: typeof row.client_name === "string" ? row.client_name : null,
    status,
    issue_date: typeof row.issue_date === "string" ? row.issue_date : "",
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    payment_link_url:
      typeof row.payment_link_url === "string" ? row.payment_link_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    terms: typeof row.terms === "string" ? row.terms : null,
    total,
    collected,
    remaining,
    line_items: asLineItems(row.line_items),
    schedule,
    nextDue,
    branding: asBranding(row as Record<string, unknown>),
  };
}
