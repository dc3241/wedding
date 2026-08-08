"use server";

import { revalidatePath } from "next/cache";
import { formatWeddingDate } from "@/components/website/template-utils";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { callClaudeForContractTemplate } from "@/lib/generate-contract-template";
import { applyTemplateTokens } from "@/lib/contract-template-tokens";
import { formatCurrency } from "@/lib/format-currency";
import { getVendorCategoryById, vendorCategoryLabel } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

const CONTRACTS_PATH = "/contracts";

export type ContractTemplateRow = {
  id: string;
  name: string;
  body: string;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type FillVendorOption = {
  projectVendorId: string;
  vendorName: string;
  category: string | null;
  quotedPrice: number | null;
};

function resolveCategory(
  category: string | null | undefined,
): { ok: true; category: string | null } | { ok: false; error: string } {
  if (category === undefined || category === null || category.trim() === "") {
    return { ok: true, category: null };
  }
  const resolved = getVendorCategoryById(category.trim());
  if (!resolved) {
    return { ok: false, error: "Choose a valid vendor category." };
  }
  return { ok: true, category: resolved.id };
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function displayOrBlank(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function moneyOrBlank(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }
  return formatCurrency(Number(value));
}

export async function generateContractTemplateDraft(input: {
  vendorCategory?: string;
  paymentStructure: string;
  cancellationWindow: string;
  notes?: string;
}): Promise<
  | { ok: true; draft: { name: string; body: string } }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const paymentStructure = input.paymentStructure.trim();
  const cancellationWindow = input.cancellationWindow.trim();
  if (!paymentStructure) {
    return { ok: false, error: "Choose a payment structure." };
  }
  if (!cancellationWindow) {
    return { ok: false, error: "Enter a cancellation window." };
  }

  const vendorCategory = input.vendorCategory?.trim() || undefined;
  if (vendorCategory && !getVendorCategoryById(vendorCategory)) {
    return { ok: false, error: "Choose a valid vendor category." };
  }

  const draft = await callClaudeForContractTemplate({
    vendorCategory,
    paymentStructure,
    cancellationWindow,
    notes: input.notes?.trim() || undefined,
  });

  if (!draft) {
    return {
      ok: false,
      error:
        "We couldn't generate a draft right now. Please try again in a moment.",
    };
  }

  return { ok: true, draft };
}

export async function createContractTemplate(input: {
  name: string;
  body: string;
  category?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Template name is required." };
  }

  const categoryResult = resolveCategory(input.category);
  if (!categoryResult.ok) {
    return categoryResult;
  }

  const supabase = await createClient();
  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const { data, error } = await supabase
    .from("contract_templates")
    .insert({
      account_id: accountId,
      name,
      body: input.body ?? "",
      category: categoryResult.category,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create template." };
  }

  revalidatePath(CONTRACTS_PATH);
  return { ok: true, id: data.id };
}

export async function updateContractTemplate(
  id: string,
  fields: { name?: string; body?: string; category?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  try {
    await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (!name) {
      return { ok: false, error: "Template name is required." };
    }
    payload.name = name;
  }

  if (fields.body !== undefined) {
    payload.body = fields.body;
  }

  if (fields.category !== undefined) {
    const categoryResult = resolveCategory(fields.category);
    if (!categoryResult.ok) {
      return categoryResult;
    }
    payload.category = categoryResult.category;
  }

  const { error } = await supabase
    .from("contract_templates")
    .update(payload)
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(CONTRACTS_PATH);
  return { ok: true };
}

export async function deleteContractTemplate(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  try {
    await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(CONTRACTS_PATH);
  return { ok: true };
}

export async function listProjectVendorsForFill(
  projectId: string,
): Promise<
  { ok: true; vendors: FillVendorOption[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  try {
    await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const { data, error } = await supabase
    .from("project_vendors")
    .select(
      "id, quoted_price, vendors(name, category, contact_name, contact_email, contact_phone, address)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  type VendorJoin = {
    name: string;
    category: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
  };

  const vendors: FillVendorOption[] = (data ?? []).map((row) => {
    const raw = row.vendors as VendorJoin | VendorJoin[] | null;
    const vendor = Array.isArray(raw) ? raw[0] : raw;
    return {
      projectVendorId: row.id,
      vendorName: vendor?.name ?? "Vendor",
      category: vendor?.category ?? null,
      quotedPrice:
        row.quoted_price === null || row.quoted_price === undefined
          ? null
          : Number(row.quoted_price),
    };
  });

  return { ok: true, vendors };
}

export async function fillContractTemplate(
  templateId: string,
  projectId: string,
  projectVendorId?: string | null,
): Promise<
  | {
      ok: true;
      merged: string;
      templateName: string;
      coupleName: string;
      businessName: string;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  const [
    { data: template, error: templateError },
    { data: project, error: projectError },
    { data: account },
  ] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("id, name, body, account_id")
      .eq("id", templateId)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, wedding_date, total_budget, account_id")
      .eq("id", projectId)
      .eq("account_id", accountId)
      .maybeSingle(),
    supabase.from("accounts").select("name").eq("id", accountId).maybeSingle(),
  ]);

  if (templateError || !template) {
    return {
      ok: false,
      error: templateError?.message ?? "Template not found.",
    };
  }

  if (projectError || !project) {
    return {
      ok: false,
      error: projectError?.message ?? "Wedding not found.",
    };
  }

  const businessName = account?.name?.trim() || "Planner";

  let vendorName = "";
  let vendorCategory = "";
  let vendorContactName = "";
  let vendorEmail = "";
  let vendorPhone = "";
  let vendorAddress = "";
  let amount = "";

  if (projectVendorId) {
    const { data: pv, error: pvError } = await supabase
      .from("project_vendors")
      .select(
        "id, quoted_price, project_id, vendors(name, category, contact_name, contact_email, contact_phone, address)",
      )
      .eq("id", projectVendorId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (pvError || !pv) {
      return {
        ok: false,
        error: pvError?.message ?? "Vendor not found on this wedding.",
      };
    }

    type VendorJoin = {
      name: string;
      category: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      address: string | null;
    };
    const raw = pv.vendors as VendorJoin | VendorJoin[] | null;
    const vendor = Array.isArray(raw) ? raw[0] : raw;

    vendorName = displayOrBlank(vendor?.name);
    vendorCategory = vendor?.category
      ? vendorCategoryLabel(vendor.category)
      : "";
    vendorContactName = displayOrBlank(vendor?.contact_name);
    vendorEmail = displayOrBlank(vendor?.contact_email);
    vendorPhone = displayOrBlank(vendor?.contact_phone);
    vendorAddress = displayOrBlank(vendor?.address);
    amount = moneyOrBlank(
      pv.quoted_price === null || pv.quoted_price === undefined
        ? null
        : Number(pv.quoted_price),
    );
  }

  const weddingDate = project.wedding_date
    ? formatWeddingDate(project.wedding_date)
    : "";

  const totalBudget =
    project.total_budget === null || project.total_budget === undefined
      ? ""
      : moneyOrBlank(Number(project.total_budget));

  const values: Record<string, string> = {
    "{{couple_name}}": displayOrBlank(project.name),
    "{{wedding_date}}": weddingDate,
    "{{total_budget}}": totalBudget,
    "{{business_name}}": businessName,
    "{{today}}": formatToday(),
    "{{vendor_name}}": vendorName,
    "{{vendor_category}}": vendorCategory,
    "{{vendor_contact_name}}": vendorContactName,
    "{{vendor_email}}": vendorEmail,
    "{{vendor_phone}}": vendorPhone,
    "{{vendor_address}}": vendorAddress,
    "{{amount}}": amount,
  };

  const merged = applyTemplateTokens(template.body, values);

  return {
    ok: true,
    merged,
    templateName: template.name,
    coupleName: displayOrBlank(project.name) || "Client",
    businessName,
  };
}
