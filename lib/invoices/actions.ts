"use server";

import { revalidatePath } from "next/cache";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import {
  invoiceTotal,
  parseMoney,
} from "@/lib/invoices/money";
import type {
  CreateInvoiceInput,
  InvoiceLineItem,
  InvoiceLineItemInput,
  InvoiceMutationResult,
  InvoiceRow,
  InvoiceStatus,
  InvoiceWriteResult,
  SendInvoiceResult,
  UpdateInvoiceFields,
} from "@/lib/invoices/types";
import { invoicePublicUrl } from "@/lib/invoices/url";
import { createClient } from "@/utils/supabase/server";

const INVOICE_STATUSES = new Set<InvoiceStatus>([
  "draft",
  "sent",
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

function normalizeLineItems(
  items: InvoiceLineItemInput[],
): { ok: true; items: { description: string; amount: number; sort_order: number }[] } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Add at least one line item." };
  }

  const normalized: { description: string; amount: number; sort_order: number }[] =
    [];

  for (let i = 0; i < items.length; i += 1) {
    const description = (items[i]?.description ?? "").trim();
    if (!description) {
      return { ok: false, error: "Each line item needs a description." };
    }
    const amount = parseMoney(items[i]?.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, error: "Line amounts must be zero or more." };
    }
    normalized.push({
      description,
      amount: Math.round(amount * 100) / 100,
      sort_order: i,
    });
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
      return {
        id: item.id,
        description: item.description,
        amount: parseMoney(item.amount),
        sort_order:
          typeof item.sort_order === "number" ? item.sort_order : 0,
      };
    })
    .filter((item): item is InvoiceLineItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function asInvoiceRow(row: Record<string, unknown>): InvoiceRow | null {
  const status = asStatus(row.status);
  if (typeof row.id !== "string" || !status) return null;
  const lineItems = mapLineItems(row.invoice_line_items);
  return {
    id: row.id,
    project_id: typeof row.project_id === "string" ? row.project_id : "",
    client_name: typeof row.client_name === "string" ? row.client_name : null,
    client_email:
      typeof row.client_email === "string" ? row.client_email : null,
    status,
    issue_date: typeof row.issue_date === "string" ? row.issue_date : "",
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    payment_link_url:
      typeof row.payment_link_url === "string" ? row.payment_link_url : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    access_token:
      typeof row.access_token === "string" ? row.access_token : "",
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    line_items: lineItems,
    total: invoiceTotal(lineItems.map((item) => item.amount)),
  };
}

const INVOICE_SELECT =
  "id, project_id, client_name, client_email, status, issue_date, due_date, payment_link_url, notes, access_token, paid_at, sent_at, created_at, invoice_line_items(id, description, amount, sort_order)";

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
      sort_order: item.sort_order,
    })),
  );

  if (itemsError) {
    await supabase.from("invoices").delete().eq("id", data.id);
    return { ok: false, error: itemsError.message };
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
  if (loaded.invoice.status !== "draft") {
    return { ok: false, error: "Only a draft can be sent." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("status", "draft");

  if (error) {
    return { ok: false, error: error.message };
  }

  const publicUrl = invoicePublicUrl(loaded.invoice.access_token);
  const to = loaded.invoice.client_email;
  let emailSent = false;

  if (to) {
    const name = loaded.invoice.client_name?.trim() || "there";
    const total = invoiceTotal(
      loaded.invoice.line_items.map((item) => item.amount),
    );
    const totalLabel = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
    const due = loaded.invoice.due_date
      ? new Date(loaded.invoice.due_date + "T00:00:00").toLocaleDateString(
          "en-US",
          { month: "long", day: "numeric", year: "numeric" },
        )
      : null;
    const subject = `Invoice for ${totalLabel}`;
    const text = [
      `Hi ${name},`,
      "",
      `Here's your invoice for ${totalLabel}.${due ? ` Due ${due}.` : ""}`,
      "",
      `View and pay: ${publicUrl}`,
      "",
    ].join("\n");
    const html = [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>Here's your invoice for ${escapeHtml(totalLabel)}.${due ? ` Due ${escapeHtml(due)}.` : ""}</p>`,
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

export async function markInvoicePaid(
  invoiceId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status === "void") {
    return { ok: false, error: "A voided invoice can't be marked paid." };
  }
  if (loaded.invoice.status === "paid") {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateInvoice(loaded.invoice.project_id, invoiceId);
  return { ok: true };
}

export async function markInvoiceUnpaid(
  invoiceId: string,
): Promise<InvoiceWriteResult> {
  const loaded = await loadInvoice(invoiceId);
  if (!loaded.ok) return loaded;
  if (loaded.invoice.status !== "paid") {
    return { ok: false, error: "Only a paid invoice can be marked unpaid." };
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
  if (loaded.invoice.status === "paid") {
    return { ok: false, error: "A paid invoice can't be voided." };
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
  if (loaded.invoice.status !== "draft") {
    return { ok: false, error: "Only a draft can be deleted." };
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
