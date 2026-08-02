"use server";

import { revalidatePath } from "next/cache";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

const VENDORS_PATH = "/vendors";

export type CreateAccountVendorInput = {
  name: string;
  category?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  serviceArea?: string;
  address?: string;
  notes?: string;
  isPreferred?: boolean;
};

export type UpdateAccountVendorFields = {
  name?: string;
  category?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  serviceArea?: string | null;
  address?: string | null;
  notes?: string | null;
};

function trimOrNull(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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

export async function createAccountVendor(
  input: CreateAccountVendorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Vendor name is required." };
  }

  const categoryResult = resolveCategory(input.category);
  if (!categoryResult.ok) {
    return categoryResult;
  }

  const supabase = await createClient();

  let accountId: string;
  try {
    accountId = await resolveBusinessAccountId(supabase);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No business account found.",
    };
  }

  const { error } = await supabase.from("vendors").insert({
    account_id: accountId,
    source: "manual",
    name,
    category: categoryResult.category,
    contact_name: trimOrNull(input.contactName),
    contact_email: trimOrNull(input.contactEmail),
    contact_phone: trimOrNull(input.contactPhone),
    website: trimOrNull(input.website),
    service_area: trimOrNull(input.serviceArea),
    address: trimOrNull(input.address),
    notes: trimOrNull(input.notes),
    is_preferred: Boolean(input.isPreferred),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(VENDORS_PATH);
  return { ok: true };
}

export async function updateAccountVendor(
  vendorId: string,
  fields: UpdateAccountVendorFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Record<string, unknown> = {};

  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (!name) {
      return { ok: false, error: "Vendor name is required." };
    }
    payload.name = name;
  }
  if (fields.category !== undefined) {
    const categoryResult = resolveCategory(fields.category);
    if (!categoryResult.ok) {
      return categoryResult;
    }
    payload.category = categoryResult.category;
  }
  if (fields.contactName !== undefined) {
    payload.contact_name = trimOrNull(fields.contactName);
  }
  if (fields.contactEmail !== undefined) {
    payload.contact_email = trimOrNull(fields.contactEmail);
  }
  if (fields.contactPhone !== undefined) {
    payload.contact_phone = trimOrNull(fields.contactPhone);
  }
  if (fields.website !== undefined) {
    payload.website = trimOrNull(fields.website);
  }
  if (fields.serviceArea !== undefined) {
    payload.service_area = trimOrNull(fields.serviceArea);
  }
  if (fields.address !== undefined) {
    payload.address = trimOrNull(fields.address);
  }
  if (fields.notes !== undefined) {
    payload.notes = trimOrNull(fields.notes);
  }

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", vendorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(VENDORS_PATH);
  return { ok: true };
}

export async function setVendorPreferred(
  vendorId: string,
  isPreferred: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update({ is_preferred: isPreferred })
    .eq("id", vendorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(VENDORS_PATH);
  return { ok: true };
}

export async function deleteAccountVendor(
  vendorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("project_vendors")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "This vendor is linked to a wedding and can’t be deleted from the library.",
    };
  }

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(VENDORS_PATH);
  return { ok: true };
}
