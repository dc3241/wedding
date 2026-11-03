import "server-only";

import { ensureFileText } from "@/lib/files/ensure-file-text";
import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * AGENTIC-08 — turn a reviewed contract into proposed schedule entries.
 *
 * Every proposed term must carry a verbatim quote from the contract. The
 * server checks the quote really appears in the file's extracted text and
 * rejects the term otherwise, so a hallucinated date or amount can't reach
 * the approval card, let alone the budget.
 */

export const MAX_CONTRACT_PAYMENTS = 8;
export const MAX_CONTRACT_DEADLINES = 8;

export type ContractTermsPayload = {
  fileId: string;
  fileName: string;
  projectVendorId: string | null;
  budgetItemId: string | null;
  budgetItemLabel: string | null;
  payments: { label: string; amount: number; dueOn: string; quote: string }[];
  deadlines: { title: string; dueOn: string; quote: string }[];
  arrival: { time: string; quote: string } | null;
};

type Raw = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Lowercase, straighten quotes/dashes, collapse whitespace. */
export function normalizeForQuote(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteAppears(haystackNormalized: string, quote: string): boolean {
  const q = normalizeForQuote(quote);
  return q.length >= 8 && haystackNormalized.includes(q);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const check = new Date(y!, m! - 1, d!);
  return check.getFullYear() === y && check.getMonth() === m! - 1 && check.getDate() === d;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d! + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pretty(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

function time12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

function clip(text: string, n = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n).trimEnd()}…`;
}

export function describeContractTerms(payload: ContractTermsPayload): string[] {
  const lines: string[] = [`From: ${payload.fileName}`];
  for (const p of payload.payments) {
    lines.push(
      `Payment: ${p.label} $${Math.round(p.amount).toLocaleString("en-US")} due ${pretty(p.dueOn)}${
        payload.budgetItemLabel ? ` (on ${payload.budgetItemLabel})` : ""
      } — “${clip(p.quote)}”`,
    );
  }
  for (const d of payload.deadlines) {
    lines.push(`Task: ${d.title}, due ${pretty(d.dueOn)} — “${clip(d.quote)}”`);
  }
  if (payload.arrival) {
    lines.push(`Vendor arrival: ${time12(payload.arrival.time)} — “${clip(payload.arrival.quote)}”`);
  }
  return lines;
}

export type CreateContractTermsResult =
  | { ok: true; proposalId: string; payments: number; deadlines: number; arrival: boolean }
  | { ok: false; error: string };

export async function createContractTermsProposal(
  projectId: string,
  input: {
    fileId: string;
    budgetItemId?: string;
    summary?: string;
    payments: unknown;
    deadlines: unknown;
    arrival: unknown;
  },
  client?: SupabaseClient,
): Promise<CreateContractTermsResult> {
  const paymentsRaw = Array.isArray(input.payments) ? (input.payments as Raw[]) : [];
  const deadlinesRaw = Array.isArray(input.deadlines) ? (input.deadlines as Raw[]) : [];
  const arrivalRaw = input.arrival && typeof input.arrival === "object" ? (input.arrival as Raw) : null;

  if (paymentsRaw.length + deadlinesRaw.length === 0 && !arrivalRaw) {
    return { ok: false, error: "Nothing to propose: pass payments, deadlines, or an arrival time." };
  }
  if (paymentsRaw.length > MAX_CONTRACT_PAYMENTS || deadlinesRaw.length > MAX_CONTRACT_DEADLINES) {
    return { ok: false, error: "Too many items; propose the most important ones." };
  }

  const supabase = await clientForWrite(client);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id, wedding_date")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { ok: false, error: projectError.message };
  if (!project) return { ok: false, error: "Project not found." };

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select(
      "id, name, mime_type, storage_path, extraction_status, extracted_text, extraction_truncated, project_vendor_id",
    )
    .eq("project_id", projectId)
    .eq("id", input.fileId)
    .maybeSingle();
  if (fileError) return { ok: false, error: fileError.message };
  if (!file) return { ok: false, error: "File not found on this project. Use get_files for ids." };

  const text = await ensureFileText(supabase, projectId, {
    id: file.id as string,
    mime_type: file.mime_type as string | null,
    storage_path: file.storage_path as string,
    extraction_status: file.extraction_status as string | null,
    extracted_text: file.extracted_text as string | null,
    extraction_truncated: file.extraction_truncated as boolean | null,
  });
  if (text.extraction_status !== "ready" || !text.extracted_text) {
    return { ok: false, error: "That file has no readable text, so its terms can't be verified." };
  }
  const haystack = normalizeForQuote(text.extracted_text);

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weddingDate = (project.wedding_date as string | null) ?? null;
  const paymentLimit = weddingDate ? addDays(weddingDate, 90) : null;

  // Budget item (needed for payments).
  let budgetItemId: string | null = null;
  let budgetItemLabel: string | null = null;
  let existingInstallments = new Set<string>();
  if (paymentsRaw.length > 0) {
    const itemId = input.budgetItemId?.trim();
    if (!itemId) {
      return { ok: false, error: "budget_item_id is required for payments (find it with get_budget)." };
    }
    const { data: item } = await supabase
      .from("budget_items")
      .select("id, label, category")
      .eq("project_id", projectId)
      .eq("id", itemId)
      .maybeSingle();
    if (!item) return { ok: false, error: "That budget item isn't on this project." };
    budgetItemId = item.id as string;
    budgetItemLabel = ((item.label as string | null) || (item.category as string | null)) ?? null;
    const { data: existing } = await supabase
      .from("payment_schedule")
      .select("amount, due_on")
      .eq("project_id", projectId)
      .eq("budget_item_id", budgetItemId);
    existingInstallments = new Set(
      (existing ?? []).map((r) => `${Number(r.amount)}:${r.due_on}`),
    );
  }

  const payments: ContractTermsPayload["payments"] = [];
  for (const raw of paymentsRaw) {
    const amount = num(raw.amount);
    const dueOn = str(raw.due_date)?.trim() ?? "";
    const quote = str(raw.quote)?.trim() ?? "";
    const label = (str(raw.label)?.trim() || "Payment").slice(0, 60);
    if (amount === undefined || amount <= 0 || amount > 1_000_000) {
      return { ok: false, error: "Each payment needs an amount between $1 and $1,000,000, exactly as written in the contract." };
    }
    if (!isRealDate(dueOn)) return { ok: false, error: `Payment "${label}" needs a real YYYY-MM-DD due_date.` };
    if (dueOn < todayIso) {
      return {
        ok: false,
        error: `Payment "${label}" is due ${dueOn}, which is in the past. Record payments already made on the Budget tab instead.`,
      };
    }
    if (paymentLimit && dueOn > paymentLimit) {
      return { ok: false, error: `Payment "${label}" is due unusually long after the wedding; check the date.` };
    }
    if (!quoteAppears(haystack, quote)) {
      return {
        ok: false,
        error: `The quote for payment "${label}" wasn't found in the contract. Quote the exact words (at least 8 characters).`,
      };
    }
    if (existingInstallments.has(`${amount}:${dueOn}`)) continue; // already scheduled
    payments.push({ label, amount, dueOn, quote: quote.slice(0, 240) });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title")
    .eq("project_id", projectId);
  const existingTitles = new Set((tasks ?? []).map((t) => String(t.title).trim().toLowerCase()));

  const deadlines: ContractTermsPayload["deadlines"] = [];
  for (const raw of deadlinesRaw) {
    const title = str(raw.title)?.trim() ?? "";
    const dueOn = str(raw.due_date)?.trim() ?? "";
    const quote = str(raw.quote)?.trim() ?? "";
    if (!title || title.length > 200) return { ok: false, error: "Each deadline needs a title under 200 characters." };
    if (!isRealDate(dueOn)) return { ok: false, error: `Deadline "${title}" needs a real YYYY-MM-DD due_date.` };
    if (dueOn < todayIso) return { ok: false, error: `Deadline "${title}" is already past (${dueOn}).` };
    if (weddingDate && dueOn > weddingDate) {
      return { ok: false, error: `Deadline "${title}" falls after the wedding date.` };
    }
    if (!quoteAppears(haystack, quote)) {
      return { ok: false, error: `The quote for deadline "${title}" wasn't found in the contract.` };
    }
    if (existingTitles.has(title.toLowerCase())) continue;
    deadlines.push({ title, dueOn, quote: quote.slice(0, 240) });
  }

  let arrival: ContractTermsPayload["arrival"] = null;
  if (arrivalRaw) {
    const time = str(arrivalRaw.time)?.trim() ?? "";
    const quote = str(arrivalRaw.quote)?.trim() ?? "";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return { ok: false, error: "arrival.time must be 24-hour HH:MM." };
    }
    if (!file.project_vendor_id) {
      return { ok: false, error: "This file isn't linked to a vendor, so an arrival time has nowhere to go." };
    }
    if (!quoteAppears(haystack, quote)) {
      return { ok: false, error: "The quote for the arrival time wasn't found in the contract." };
    }
    arrival = { time, quote: quote.slice(0, 240) };
  }

  if (payments.length + deadlines.length === 0 && !arrival) {
    return { ok: false, error: "Everything in that contract is already scheduled; nothing new to add." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: ContractTermsPayload = {
    fileId: file.id as string,
    fileName: String(file.name),
    projectVendorId: (file.project_vendor_id as string | null) ?? null,
    budgetItemId,
    budgetItemLabel,
    payments,
    deadlines,
    arrival,
  };
  const { data: inserted, error: insertError } = await supabase
    .from("assistant_proposals")
    .insert({
      account_id: project.account_id,
      project_id: projectId,
      kind: "contract_terms",
      title: `Add dates from ${payload.fileName}`,
      summary: input.summary?.trim().slice(0, 300) || null,
      payload,
      status: "pending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not save the proposal." };
  }
  return {
    ok: true,
    proposalId: inserted.id,
    payments: payments.length,
    deadlines: deadlines.length,
    arrival: arrival !== null,
  };
}
