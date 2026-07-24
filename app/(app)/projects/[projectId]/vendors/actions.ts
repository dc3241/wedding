"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { runVendorEnrichment } from "@/lib/vendor-enrichment";
import { createClient } from "@/utils/supabase/server";

export type DiscoveredPlace = {
  id: string;
  displayName: string;
  websiteUri?: string;
};

function vendorsPath(projectId: string) {
  return `/projects/${projectId}/vendors`;
}

function vendorDetailPath(projectId: string, vendorId: string) {
  return `/projects/${projectId}/vendors/${vendorId}`;
}

function searchPath(projectId: string) {
  return `/projects/${projectId}/vendors/search`;
}

async function revalidateVendorProjects(vendorId: string) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("project_vendors")
    .select("project_id")
    .eq("vendor_id", vendorId);

  for (const link of links ?? []) {
    revalidatePath(vendorsPath(link.project_id));
    revalidatePath(vendorDetailPath(link.project_id, vendorId));
  }
}

function scheduleVendorEnrichment(vendorId: string) {
  after(async () => {
    try {
      await runVendorEnrichment(vendorId);
      await revalidateVendorProjects(vendorId);
    } catch {
      // Enrichment is best-effort; never crash the caller.
    }
  });
}

export async function enrichVendor(
  vendorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await runVendorEnrichment(vendorId);

  if (result.ok) {
    await revalidateVendorProjects(vendorId);
  }

  return result;
}

export async function getAddedPlaceIds(projectId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("vendors")
    .select("external_place_id, project_vendors!inner(project_id)")
    .eq("project_vendors.project_id", projectId)
    .not("external_place_id", "is", null);

  return (data ?? [])
    .map((row) => row.external_place_id)
    .filter((id): id is string => Boolean(id));
}

export async function addDiscoveredVendor(
  projectId: string,
  place: DiscoveredPlace,
  categoryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const category = getVendorCategoryById(categoryId.trim());
  if (!category) {
    return { ok: false, error: "Choose a valid vendor category." };
  }
  const trimmedName = place.displayName.trim();

  if (!trimmedName) {
    return { ok: false, error: "Vendor name is missing." };
  }

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("account_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, error: "Project not found." };
  }

  let vendorId: string | undefined;

  const { data: existingVendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("account_id", project.account_id)
    .eq("external_place_id", place.id)
    .maybeSingle();

  if (existingVendor) {
    vendorId = existingVendor.id;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("vendors")
      .insert({
        account_id: project.account_id,
        source: "google_places",
        external_place_id: place.id,
        name: trimmedName,
        category: category.id,
        website: place.websiteUri?.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raced } = await supabase
          .from("vendors")
          .select("id")
          .eq("account_id", project.account_id)
          .eq("external_place_id", place.id)
          .single();

        if (raced) vendorId = raced.id;
      }

      if (!vendorId) {
        return { ok: false, error: insertError.message };
      }
    } else {
      vendorId = inserted.id;
    }
  }

  if (!vendorId) {
    return { ok: false, error: "Could not create or find vendor." };
  }

  const { data: existingLink } = await supabase
    .from("project_vendors")
    .select("id")
    .eq("project_id", projectId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!existingLink) {
    const { error: linkError } = await supabase.from("project_vendors").insert({
      project_id: projectId,
      vendor_id: vendorId,
      status: "to_contact",
    });

    if (linkError) {
      return { ok: false, error: linkError.message };
    }
  }

  revalidatePath(vendorsPath(projectId));
  revalidatePath(searchPath(projectId));

  scheduleVendorEnrichment(vendorId);

  return { ok: true };
}

export type AddVendorStatus = "to_contact" | "booked";

export async function addVendor(
  projectId: string,
  name: string,
  categoryId: string,
  contactEmail: string,
  status: AddVendorStatus = "to_contact",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Vendor name is required." };
  }

  const category = getVendorCategoryById(categoryId.trim());
  if (!category) {
    return { ok: false, error: "Choose a valid vendor category." };
  }

  if (status !== "to_contact" && status !== "booked") {
    return { ok: false, error: "Choose a valid status." };
  }

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("account_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { ok: false, error: "Project not found." };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      account_id: project.account_id,
      source: "manual",
      name: trimmedName,
      category: category.id,
      contact_email: contactEmail.trim() || null,
    })
    .select("id")
    .single();

  if (vendorError) {
    return { ok: false, error: vendorError.message };
  }

  const { error: linkError } = await supabase.from("project_vendors").insert({
    project_id: projectId,
    vendor_id: vendor.id,
    status,
  });

  if (linkError) {
    return { ok: false, error: linkError.message };
  }

  revalidatePath(vendorsPath(projectId));
  return { ok: true };
}

export async function removeProjectVendor(projectVendorId: string) {
  const supabase = await createClient();

  const { data: row, error: fetchError } = await supabase
    .from("project_vendors")
    .select("project_id")
    .eq("id", projectVendorId)
    .single();

  if (fetchError) throw fetchError;

  // FK on delete sets project_vendor_id null but leaves status='booked'.
  // Reset the slot to needed before the delete so it returns to Still to book.
  const { error: resetError } = await supabase
    .from("vendor_targets")
    .update({ project_vendor_id: null, status: "needed" })
    .eq("project_id", row.project_id)
    .eq("project_vendor_id", projectVendorId);

  if (resetError) throw resetError;

  const { error } = await supabase
    .from("project_vendors")
    .delete()
    .eq("id", projectVendorId);

  if (error) throw error;

  revalidatePath(vendorsPath(row.project_id));
}

export async function linkVendorToTarget(
  targetId: string,
  projectVendorId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_targets")
    .update({
      project_vendor_id: projectVendorId,
      status: "booked",
    })
    .eq("id", targetId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(vendorsPath(data.project_id));
}

export async function unlinkVendorFromTarget(targetId: string) {
  const supabase = await createClient();

  // Clear the vendor only — leave status='booked' so the slot stays in the
  // Booked band as "booked, vendor not recorded" (Connect existing / add new).
  const { data, error } = await supabase
    .from("vendor_targets")
    .update({
      project_vendor_id: null,
    })
    .eq("id", targetId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(vendorsPath(data.project_id));
}

/** Manual contact fields only — never write address from Google Places. */
export async function updateVendorContactDetails(
  vendorId: string,
  fields: { contactPhone?: string; address?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updates: { contact_phone?: string | null; address?: string | null } =
    {};

  if (fields.contactPhone !== undefined) {
    updates.contact_phone = fields.contactPhone.trim() || null;
  }
  if (fields.address !== undefined) {
    updates.address = fields.address.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", vendorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateVendorProjects(vendorId);
  return { ok: true };
}

export async function addVendorTarget(
  projectId: string,
  category: string,
  note?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resolved = getVendorCategoryById(category.trim());
  if (!resolved) {
    return {
      ok: false,
      error:
        "That isn't a known vendor category. Pick one of the supported categories.",
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vendor_targets")
    .select("id")
    .eq("project_id", projectId)
    .eq("category", resolved.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "That vendor category is already on your list to book.",
    };
  }

  const { error } = await supabase.from("vendor_targets").insert({
    project_id: projectId,
    category: resolved.id,
    note: note?.trim() || null,
    status: "needed",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(vendorsPath(projectId));
  return { ok: true };
}

export async function updateProjectVendorStatus(
  projectVendorId: string,
  nextStatus: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_vendors")
    .update({ status: nextStatus })
    .eq("id", projectVendorId)
    .select("project_id, vendor_id")
    .single();

  if (error) throw error;

  revalidatePath(vendorsPath(data.project_id));
  revalidatePath(vendorDetailPath(data.project_id, data.vendor_id));
}

const VENDOR_TARGET_STATUSES = ["needed", "booked", "skipped"] as const;
export type VendorTargetStatus = (typeof VENDOR_TARGET_STATUSES)[number];

export async function setVendorTargetStatus(
  targetId: string,
  status: string,
) {
  if (
    !VENDOR_TARGET_STATUSES.includes(status as VendorTargetStatus)
  ) {
    throw new Error("Invalid vendor target status.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_targets")
    .update({ status })
    .eq("id", targetId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(vendorsPath(data.project_id));
}
