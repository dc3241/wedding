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
  const trimmedCategory = category.label;
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
        category: trimmedCategory,
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

export async function addVendor(
  projectId: string,
  name: string,
  category: string,
  contactEmail: string
) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("account_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) throw projectError ?? new Error("Project not found");

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      account_id: project.account_id,
      source: "manual",
      name: trimmedName,
      category: category.trim() || null,
      contact_email: contactEmail.trim() || null,
    })
    .select("id")
    .single();

  if (vendorError) throw vendorError;

  const { error: linkError } = await supabase.from("project_vendors").insert({
    project_id: projectId,
    vendor_id: vendor.id,
    status: "to_contact",
  });

  if (linkError) throw linkError;

  revalidatePath(vendorsPath(projectId));
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
