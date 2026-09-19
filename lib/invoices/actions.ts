"use server";

import { getAccountContext } from "@/lib/account-context";
import { revalidatePath } from "next/cache";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { deriveInvoiceStatus } from "@/lib/invoices/coverage";
import {
  asInvoiceLineKind,
  invoiceLineAmount,
  parseInvoiceQuantity,
} from "@/lib/invoices/lines";
import { asPaymentMethod } from "@/lib/invoices/methods";
import {
  invoiceLocalDateKey,
  invoiceRemaining,
  invoiceTotal,
  parseMoney,
  roundInvoiceMoney,
} from "@/lib/invoices/money";
import { deriveInvoiceSchedule } from "@/lib/invoices/schedule";
import type {
  AccountInvoiceRow,
  CreateInvoiceInput,
  InvoiceLineItem,
  InvoiceLineItemInput,
  InvoiceLineKind,
  InvoiceMutationResult,
  InvoicePayment,
  InvoicePaymentInput,
  InvoiceRow,
  InvoiceScheduleInput,
  InvoiceScheduleRow,
  InvoiceStatus,
  InvoiceTemplate,
  InvoiceTemplateLine,
  InvoiceWriteResult,
  SendInvoiceResult,
  UpdateInvoiceFields,
} from "@/lib/invoices/types";
import { invoicePublicUrl } from "@/lib/invoices/url";
import { createClient } from "@/utils/supabase/server";

const INVOICE_STATUSES = new Set<InvoiceStatus>([
  "draft",
  "sent",
  "partial",
  "paid",
  "void",
]);

function invoicesPath(projectId: string) {
  return `/projects/${projectId}/invoices`;
}

function invoiceDetailPath(projectId: string, invoiceId: string) {
  return `/projects/${projectId}/invoices/${invoiceId}`;
}

function revalidateInvoice(projectId: string, invoiceId?: string) {
  revalidatePath(invoicesPath(projectId));
  if (invoiceId) revalidatePath(invoiceDetailPath(projectId, invoiceId));
  revalidatePath("/money");
  revalidatePath("/invoices");
}

function parseDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const check = new Date(y!, m! - 1, d!);
  if (
    check.getFullYear() !== y ||
    check.getMonth() !== m! - 1 ||
    check.getDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

function asStatus(value: unknown): InvoiceStatus | null {
  if (typeof value !== "string") return null;
  return INVOICE_STATUSES.has(value as InvoiceStatus)
    ? (value as InvoiceStatus)
    : null;
}

type NormalizedLine = {
  description: string;
  quantity: number;
  unit_price: number;
  kind: InvoiceLineKind;
  amount: number;
  sort_order: number;
};

function normalizeLineItems(
  items: InvoiceLineItemInput[],
): { ok: true; items: NormalizedLine[] } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Add at least one line item." };
  }

  const normalized: NormalizedLine[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const description = (items[i]?.description ?? "").trim();
    if (!description) {
      return { ok: false, error: "Each line item needs a description." };
    }
    const kind = asInvoiceLineKind(items[i]?.kind) ?? "item";
    const quantity = parseInvoiceQuantity(items[i]?.quantity);
    if (!(quantity > 0)) {
      return { ok: false, error: "Quantity must be greater than zero." };
    }
    const unitPrice = parseMoney(items[i]?.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: "Rate must be zero or more." };
    }
    normalized.push({
      description,
      quantity,
      unit_price: unitPrice,
      kind,
      amount: invoiceLineAmount(kind, quantity, unitPrice),
      sort_order: i,
    });
  }

  const total = invoiceTotal(normalized.map((item) => item.amount));
  if (total < 0) {
    return { ok: false, error: "Discount can't exceed the invoice total." };
  }

  return { ok: true, items: normalized };
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function optionalUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapLineItems(rows: unknown): InvoiceLineItem[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      if (typeof item.id !== "string" || typeof item.description !== "string") {
        return null;
      }
      const amount = parseMoney(item.amount);
      const kind = asInvoiceLineKind(item.kind) ?? (amount < 0 ? "discount" : "item");
      const quantity = parseInvoiceQuantity(item.quantity) || 1;
      const unitPrice =
        item.unit_price != null
          ? parseMoney(item.unit_price)
          : roundInvoiceMoney(Math.abs(amount) / quantity);
      return {
        id: item.id,
        description: item.description,
        quantity,
        unit_price: unitPrice,
        kind,
        amount,
        sort_order:
          typeof item.sort_order === "number" ? item.sort_order : 0,
      };
    })
    .filter((item): item is InvoiceLineItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function mapTemplateLines(value: unknown): InvoiceTemplateLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      if (typeof item.description !== "string" || !item.description.trim()) {
        return null;
      }
      const kind = asInvoiceLineKind(item.kind) ?? "item";
      const quantity = parseInvoiceQuantity(item.quantity) || 1;
      const unitPrice = parseMoney(item.unit_price);
      if (unitPrice < 0) return null;
      return {
        description: item.description.trim(),
        quantity,
        unit_price: unitPrice,
        kind,
      };
    })
    .filter((item): item is InvoiceTemplateLine => item !== null);
}

function mapPayments(rows: unknown): InvoicePayment[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const method = asPaymentMethod(item.method);
      if (typeof item.id !== "string" || !method) return null;
      if (typeof item.paid_on !== "string") return null;
      return {
        id: item.id,
        amount: parseMoney(item.amount),
        paid_on: item.paid_on,
        method,
        note: typeof item.note === "string" ? item.note : null,
        external_ref:
          typeof item.external_ref === "string" ? item.external_ref : null,
        created_at: typeof item.created_at === "string" ? item.created_at : "",
      };
    })
    .filter((item): item is InvoicePayment => item !== null)
    .sort((a, b) => {
      if (a.paid_on !== b.paid_on) return a.paid_on.localeCompare(b.paid_on);
      return a.created_at.localeCompare(b.created_at);
    });
}

function mapSchedule(rows: unknown): InvoiceScheduleRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      if (typeof item.id !== "string" || typeof item.due_on !== "string") {
        return null;
      }
      const amount = parseMoney(item.amount);
      if (!(amount > 0)) return null;
      return {
        id: item.id,
        amount,
        due_on: item.due_on,
        label: typeof item.label === "string" ? item.label : null,
        created_at: typeof item.created_at === "string" ? item.created_at : "",
      };
    })
    .filter((item): item is InvoiceScheduleRow => item !== null);
}

function projectEmbed(
  value: unknown,
): { name: string; wedding_date: string | null; archived_at: string | null } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    name: typeof row.name === "string" ? row.name : "Wedding",
    wedding_date: typeof row.wedding_date === "string" ? row.wedding_date : null,
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
  };
}

function asInvoiceRow(row: Record<string, unknown>): InvoiceRow | null {
  const status = asStatus(row.status);
  if (typeof row.id !== "string" || !status) return null;
  const lineItems = mapLineItems(row.invoice_line_items);
  const payments = mapPayments(row.invoice_payments);
  const total = invoiceTotal(lineItems.map((item) => item.amount));
  const collected = invoiceTotal(payments.map((item) => item.amount));
  const remaining = invoiceRemaining(total, collected);
  const derived = deriveInvoiceSchedule(
    mapSchedule(row.invoice_schedule),
    collected,
    remaining,
  );
  return {
    id: row.id,
    project_id: typeof row.project_id === "string" ? row.project_id : "",
    invoice_number:
      typeof row.invoice_number === "string" ? row.invoice_number : "",
    client_name: typeof row.client_name === "string" ? row.client_name : null,
    client_email:
      typeof row.client_email === "string" ? row.client_email : null,
    status,
    issue_date: typeof row.issue_date === "string" ? row.issue_date : "",
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    payment_link_url:
      typeof row.payment_link_url === "string" ? row.payment_link_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    terms: typeof row.terms === "string" ? row.terms : null,
    access_token:
      typeof row.access_token === "string" ? row.access_token : "",
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    line_items: lineItems,
    payments,
    schedule: derived.schedule,
    nextDue: derived.nextDue,
    total,
    collected,
    remaining,
  };
}

function asAccountInvoiceRow(
  row: Record<string, unknown>,
): AccountInvoiceRow | null {
  const base = asInvoiceRow(row);
  if (!base) return null;
  const project = projectEmbed(row.projects);
  return {
    ...base,
    project_name: project?.name ?? "Wedding",
    wedding_date: project?.wedding_date ?? null,
    archived_at: project?.archived_at ?? null,
  };
}

const INVOICE_SELECT =
  "id, project_id, invoice_number, client_name, client_email, status, issue_date, due_date, payment_link_url, notes, terms, access_token, paid_at, sent_at, created_at, invoice_line_items(id, description, amount, quantity, unit_price, kind, sort_order), invoice_payments(id, amount, paid_on, method, note, external_ref, created_at), invoice_schedule(id, amount, due_on, label, created_at)";

const ACCOUNT_INVOICE_SELECT = `${INVOICE_SELECT}, projects(name, wedding_date, archived_at)`;

async function loadInvoice(
  invoiceId: string,
): Promise<
  | { ok: true; invoice: InvoiceRow }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Invoice not found." };
  }
  const invoice = asInvoiceRow(data as Record<string, unknown>);
  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }
  return { ok: true, invoice };
}

async function persistCoverage(
  invoice: InvoiceRow,
): Promise<InvoiceWriteResult> {
  const nextStatus = deriveInvoiceStatus({
    status: invoice.status,
    collected: invoice.collected,
    total: invoice.total,
    sentAt: invoice.sent_at,
  });
  const paidAt =
    nextStatus === "paid"
      ? invoice.paid_at ?? new Date().toISOString()
      : null;

  if (nextStatus === invoice.status && paidAt === invoice.paid_at) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      paid_at: paidAt,
    })
    .eq("id", invoice.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listProjectInvoices(
  projectId: string,
): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data
    .map((row) => asInvoiceRow(row as Record<string, unknown>))
    .filter((row): row is InvoiceRow => row !== null);
}

export async function listAccountInvoices(
  accountId: string,
): Promise<AccountInvoiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(ACCOUNT_INVOICE_SELECT)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data
    .map((row) => asAccountInvoiceRow(row as Record<string, unknown>))
    .filter((row): row is AccountInvoiceRow => row !== null);
}

export async function getInvoice(
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const result = await loadInvoice(invoiceId);
  return result.ok ? result.invoice : null;
}

export async function createInvoice(
  projectId: string,
  input: CreateInvoiceInput,
): Promise<InvoiceMutationResult> {
  const lineItems = normalizeLineItems(input.lineItems);
  if (!lineItems.ok) return lineItems;

  let dueDate: string | null = null;
  if (input.dueDate != null && input.dueDate.trim() !== "") {
    dueDate = parseDateOnly(input.dueDate);
    if (dueDate === null) {
      return { ok: false, error: "Due date must be a valid date." };
    }
  }

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project?.account_id) {
    return { ok: false, error: "Project not found." };
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      project_id: projectId,
      account_id: project.account_id,
      client_name: optionalText(input.clientName),
      client_email: optionalText(input.clientEmail),
      due_date: dueDate,
      notes: optionalText(input.notes),
      terms: optionalText(input.terms),
      payment_link_url: optionalUrl(input.paymentLinkUrl),
      proposal_id: input.proposalId?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create invoice." };
  }

  const { error: itemsError } = await supabase.from("invoice_line_items").insert(
    lineItems.items.map((item) => ({
      invoice_id: data.id,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      unit_price: item.unit_price,
      kind: item.kind,
      sort_order: item.sort_order,
    })),
  );

  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", data.id);
    return { ok: false, error: itemsError.message };
  }

  if (dueDate) {
    const scheduleTotal = invoiceTotal(
      lineItems.items.map((item) => item.amount),
    );
    if (scheduleTotal > 0) {
      const { error: scheduleError } = await supabase
        .from("invoice_schedule")
        .insert({
          invoice_id: data.id,
          amount: scheduleTotal,
          due_on: dueDate,
          label: "Balance",
        });
      if (scheduleError) {
        await supabase.from("invoices").delete().eq("id", data.id);
        return { ok: false, error: scheduleError.message };
      }
    }
  }

  revalidateInvoice(projectId, data.id);
  return { ok: true, id: data.id };
}

export async function updateInvoice(
  invoiceId: string,
  fields: UpdateInvoiceFields,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "Voided invoices can't be edited." };
  }

  const patch: Record<string, string | null> = {};

  if (fields.clientName !== undefined) {
    patch.client_name = optionalText(fields.clientName);
  }
  if (fields.clientEmail !== undefined) {
    patch.client_email = optionalText(fields.clientEmail);
  }
  if (fields.notes !== undefined) {
    patch.notes = optionalText(fields.notes);
  }
  if (fields.terms !== undefined) {
    patch.terms = optionalText(fields.terms);
  }
  if (fields.paymentLinkUrl !== undefined) {
    patch.payment_link_url = optionalUrl(fields.paymentLinkUrl);
  }
  if (fields.dueDate !== undefined) {
    if (fields.dueDate == null || fields.dueDate.trim() === "") {
      patch.due_date = null;
    } else {
      const dueDate = parseDateOnly(fields.dueDate);
      if (dueDate === null) {
        return { ok: false, error: "Due date must be a valid date." };
      }
      patch.due_date = dueDate;
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function updateInvoiceLineItems(
  invoiceId: string,
  lineItems: InvoiceLineItemInput[],
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status !== "draft") {
    return { ok: false, error: "Line items can only be edited on a draft." };
  }
  if (loaded.invoice.collected > 0) {
    return { ok: false, error: "Remove recorded payments before editing line items." };
  }

  const normalized = normalizeLineItems(lineItems);
  if (!normalized.ok) return normalized;

  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", invoiceId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase.from("invoice_line_items").insert(
    normalized.items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      unit_price: item.unit_price,
      kind: item.kind,
      sort_order: item.sort_order,
    })),
  );

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function sendInvoice(
  invoiceId: string,
): Promise<SendInvoiceResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't be sent." };
  }
  if (loaded.invoice.sent_at) {
    return { ok: false, error: "This invoice was already sent." };
  }

  const supabase = await createClient();

  if (
    loaded.invoice.schedule.length === 0 &&
    loaded.invoice.due_date &&
    loaded.invoice.total > 0
  ) {
    const { error: scheduleError } = await supabase
      .from("invoice_schedule")
      .insert({
        invoice_id: invoiceId,
        amount: loaded.invoice.total,
        due_on: loaded.invoice.due_date,
        label: "Balance",
      });
    if (scheduleError) {
      return { ok: false, error: scheduleError.message };
    }
  }

  const sentAt = new Date().toISOString();
  const { error } = await supabase
    .from("invoices")
    .update({
      sent_at: sentAt,
    })
    .eq("id", invoiceId)
    .is("sent_at", null);

  if (error) {
    return { ok: false, error: error.message };
  }

  const withSent: InvoiceRow = { ...loaded.invoice, sent_at: sentAt };
  const synced = await persistCoverage(withSent);
  if (!synced.ok) return synced;

  const publicUrl = invoicePublicUrl(loaded.invoice.access_token);
  const to = loaded.invoice.client_email;
  let emailSent = false;

  if (to) {
    const name = loaded.invoice.client_name?.trim() || "there";
    const remaining = loaded.invoice.remaining;
    const totalLabel = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(loaded.invoice.total);
    const dueLabel = remaining > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(remaining)
      : null;
    const due = loaded.invoice.due_date
      ? new Date(loaded.invoice.due_date + "T00:00:00").toLocaleDateString(
          "en-US",
          { month: "long", day: "numeric", year: "numeric" },
        )
      : null;
    const numberLabel = loaded.invoice.invoice_number
      ? ` ${loaded.invoice.invoice_number}`
      : "";
    const subject = `Invoice${numberLabel} for ${totalLabel}`;
    const dueLine = dueLabel
      ? ` Amount due ${dueLabel}.${due ? ` Due ${due}.` : ""}`
      : due
        ? ` Due ${due}.`
        : "";
    const text = [
      `Hi ${name},`,
      "",
      `Here's your invoice${numberLabel} for ${totalLabel}.${dueLine}`,
      "",
      `View and pay: ${publicUrl}`,
      "",
    ].join("\n");
    const html = [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>Here's your invoice${escapeHtml(numberLabel)} for ${escapeHtml(totalLabel)}.${dueLine ? escapeHtml(dueLine) : ""}</p>`,
      `<p><a href="${escapeHtml(publicUrl)}">View and pay</a></p>`,
    ].join("");

    emailSent = await sendEmailBestEffort(
      { to, subject, text, html },
      "sendInvoice",
    );
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true, emailSent, publicUrl };
}

export async function recordInvoicePayment(
  invoiceId: string,
  input: InvoicePaymentInput,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't take payments." };
  }

  const amount = parseMoney(input.amount);
  if (!(amount > 0)) {
    return { ok: false, error: "Enter a payment greater than zero." };
  }
  if (amount - loaded.invoice.remaining > 0.005) {
    return { ok: false, error: "Amount is more than the remaining balance." };
  }

  const paidOn = parseDateOnly(input.paidOn);
  if (!paidOn) {
    return { ok: false, error: "Paid on must be a valid date." };
  }

  const method = asPaymentMethod(input.method);
  if (!method) {
    return { ok: false, error: "Choose a payment method." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount,
    paid_on: paidOn,
    method,
    note: optionalText(input.note),
    external_ref: optionalText(input.externalRef),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const refreshed = await loadInvoice(invoiceId);
  if (!refreshed.ok) return refreshed;
  const synced = await persistCoverage(refreshed.invoice);
  if (!synced.ok) return synced;

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function removeInvoicePayment(
  invoiceId: string,
  paymentId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't be changed." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_payments")
    .delete()
    .eq("id", paymentId)
    .eq("invoice_id", invoiceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  const refreshed = await loadInvoice(invoiceId);
  if (!refreshed.ok) return refreshed;
  const synced = await persistCoverage(refreshed.invoice);
  if (!synced.ok) return synced;

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function markInvoicePaid(
  invoiceId: string,
  input?: { paidOn?: string; method?: InvoicePaymentInput["method"] },
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't be marked paid." };
  }
  if (loaded.invoice.remaining <= 0) {
    const synced = await persistCoverage(loaded.invoice);
    if (!synced.ok) return synced;
    revalidateInvoice(loaded.invoice.project_id, invoiceId);
    return { ok: true };
  }

  return recordInvoicePayment(invoiceId, {
    amount: loaded.invoice.remaining,
    paidOn: input?.paidOn?.trim() || invoiceLocalDateKey(),
    method: input?.method ?? "other",
    note: "Marked paid",
  });
}

export async function markInvoiceUnpaid(
  invoiceId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status !== "paid") {
    return { ok: false, error: "Only a paid invoice can be marked unpaid." };
  }
  if (loaded.invoice.collected > 0) {
    return {
      ok: false,
      error: "Remove recorded payments to mark this unpaid.",
    };
  }

  const nextStatus: InvoiceStatus = loaded.invoice.sent_at ? "sent" : "draft";
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      paid_at: null,
    })
    .eq("id", invoiceId)
    .eq("status", "paid");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function voidInvoice(
  invoiceId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "paid" || loaded.invoice.collected > 0) {
    return {
      ok: false,
      error: "Remove recorded payments before voiding.",
    };
  }
  if (loaded.invoice.status === "void") {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", invoiceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function deleteInvoice(
  invoiceId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status !== "draft" || loaded.invoice.collected > 0) {
    return { ok: false, error: "Only a draft with no payments can be deleted." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("status", "draft");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id);
  return { ok: true };
}

export async function addInvoiceInstallment(
  invoiceId: string,
  input: InvoiceScheduleInput,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't take a schedule." };
  }

  const amount = parseMoney(input.amount);
  if (!(amount > 0)) {
    return { ok: false, error: "Enter an installment greater than zero." };
  }
  const dueOn = parseDateOnly(input.dueOn);
  if (!dueOn) {
    return { ok: false, error: "Due on must be a valid date." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_schedule").insert({
    invoice_id: invoiceId,
    amount,
    due_on: dueOn,
    label: optionalText(input.label),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function removeInvoiceInstallment(
  invoiceId: string,
  installmentId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't be changed." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_schedule")
    .delete()
    .eq("id", installmentId)
    .eq("invoice_id", invoiceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function duplicateInvoice(
  invoiceId: string,
): Promise<InvoiceMutationResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;

  return createInvoice(loaded.invoice.project_id, {
    clientName: loaded.invoice.client_name,
    clientEmail: loaded.invoice.client_email,
    dueDate: loaded.invoice.due_date,
    notes: loaded.invoice.notes,
    terms: loaded.invoice.terms,
    paymentLinkUrl: loaded.invoice.payment_link_url,
    lineItems: loaded.invoice.line_items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      kind: item.kind,
    })),
  });
}

function asTemplate(row: Record<string, unknown>): InvoiceTemplate | null {
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const lineItems = mapTemplateLines(row.line_items);
  if (lineItems.length === 0) return null;
  return {
    id: row.id,
    name: row.name,
    notes: typeof row.notes === "string" ? row.notes : null,
    terms: typeof row.terms === "string" ? row.terms : null,
    line_items: lineItems,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function listInvoiceTemplates(): Promise<InvoiceTemplate[]> {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  if (account?.kind !== "business") return [];

  const { data, error } = await supabase
    .from("invoice_templates")
    .select("id, name, notes, terms, line_items, created_at")
    .eq("account_id", account.accountId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data
    .map((row) => asTemplate(row as Record<string, unknown>))
    .filter((row): row is InvoiceTemplate => row !== null);
}

export async function saveInvoiceTemplate(
  invoiceId: string,
  name: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Give the template a name." };
  }

  const lineItems = loaded.invoice.line_items;
  if (lineItems.length === 0) {
    return { ok: false, error: "Add line items before saving a template." };
  }

  const supabase = await createClient();
  const { data: invoiceAccount, error: accountError } = await supabase
    .from("invoices")
    .select("account_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (accountError || !invoiceAccount?.account_id) {
    return { ok: false, error: "Couldn't save that template." };
  }

  const { error } = await supabase.from("invoice_templates").insert({
    account_id: invoiceAccount.account_id,
    name: trimmed,
    notes: loaded.invoice.notes,
    terms: loaded.invoice.terms,
    line_items: lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      kind: item.kind,
    })),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function deleteInvoiceTemplate(
  templateId: string,
  projectId: string,
): Promise<InvoiceWriteResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(projectId);
  return { ok: true };
}

