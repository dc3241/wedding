"use server";

import { revalidatePath } from "next/cache";
import { enrichVendor } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { VENDOR_MEDIA_BUCKET } from "@/app/(app)/vendors/vendor-media-shared";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

const VENDORS_PATH = "/vendors";

function vendorDetailPath(vendorId: string) {
  return `/vendors/${vendorId}`;
}

function revalidateVendorLibrary(vendorId: string) {
  revalidatePath(VENDORS_PATH);
  revalidatePath(vendorDetailPath(vendorId));
}

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
  isPreferred?: boolean;
  aiOverview?: string | null;
  instagram?: string | null;
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
  if (fields.isPreferred !== undefined) {
    payload.is_preferred = Boolean(fields.isPreferred);
  }
  if (fields.aiOverview !== undefined) {
    payload.ai_overview = trimOrNull(fields.aiOverview);
  }
  if (fields.instagram !== undefined) {
    payload.instagram = trimOrNull(fields.instagram);
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

  revalidateVendorLibrary(vendorId);
  return { ok: true };
}

/** Manual refresh — wires existing enrichVendor; no new enrichment logic. */
export async function refreshVendorFromWebsite(
  vendorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await enrichVendor(vendorId);
  if (result.ok) {
    revalidateVendorLibrary(vendorId);
  }
  return result;
}

/** Remove a portfolio object. Folder listing is the gallery source of truth. */
export async function removeVendorPhoto(
  accountId: string,
  vendorId: string,
  objectPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expectedPrefix = `${accountId}/${vendorId}/`;
  if (
    !objectPath.startsWith(expectedPrefix) ||
    objectPath.includes("..") ||
    objectPath.split("/").length !== 3
  ) {
    return { ok: false, error: "Invalid photo path." };
  }

  const supabase = await createClient();

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, account_id")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError || !vendor || vendor.account_id !== accountId) {
    return { ok: false, error: "Vendor not found." };
  }

  const { error } = await supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .remove([objectPath]);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateVendorLibrary(vendorId);
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

  revalidateVendorLibrary(vendorId);
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
