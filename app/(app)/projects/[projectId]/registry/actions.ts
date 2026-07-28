"use server";

import { revalidatePath } from "next/cache";
import type { RegistryItemFields } from "./types";
import {
  normalizeProductUrl,
  parseRegistryItemPreview,
  type RegistryItemPreview,
} from "@/lib/registry";
import { createClient } from "@/utils/supabase/server";

function registryPath(projectId: string) {
  return `/projects/${projectId}/registry`;
}

function websitePath(projectId: string) {
  return `/projects/${projectId}/website`;
}

function revalidateRegistrySurfaces(projectId: string, slug?: string | null) {
  revalidatePath(registryPath(projectId));
  revalidatePath(websitePath(projectId));
  if (slug) {
    revalidatePath(`/w/${slug}`);
    revalidatePath(`/w/${slug}/registry`);
  }
}

/**
 * Prefill-only. Mirrors vendor-enrichment's native fetch + AbortController.
 * Never throws; never writes.
 */
export async function fetchRegistryItemPreview(
  url: string,
): Promise<RegistryItemPreview> {
  try {
    const normalized = normalizeProductUrl(url);
    if (!normalized) return {};

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let response: Response;
    try {
      response = await fetch(normalized, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (compatible; WeddingPlannerBot/1.0; +https://localhost)",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return {};

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/plain")
    ) {
      return {};
    }

    const html = await response.text();
    return parseRegistryItemPreview(html);
  } catch {
    return {};
  }
}

function normalizeFields(fields: RegistryItemFields) {
  const name = fields.name.trim();
  if (!name) return null;

  const quantity =
    fields.quantity_wanted === undefined
      ? 1
      : Math.max(1, Math.floor(Number(fields.quantity_wanted) || 1));

  let price: number | null = null;
  if (fields.price !== undefined && fields.price !== null) {
    const n = Number(fields.price);
    price = Number.isFinite(n) ? n : null;
  }

  return {
    name,
    price,
    image_url: fields.image_url?.trim() || null,
    buy_url: fields.buy_url?.trim() || null,
    quantity_wanted: quantity,
    note: fields.note?.trim() || null,
  };
}

export async function addRegistryItem(
  projectId: string,
  fields: RegistryItemFields,
) {
  const row = normalizeFields(fields);
  if (!row) return;

  const supabase = await createClient();

  const { error } = await supabase.from("registry_items").insert({
    project_id: projectId,
    ...row,
  });

  if (error) throw error;

  revalidateRegistrySurfaces(projectId);
}

export async function updateRegistryItem(
  id: string,
  fields: RegistryItemFields,
) {
  const row = normalizeFields(fields);
  if (!row) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registry_items")
    .update(row)
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateRegistrySurfaces(data.project_id);
}

export async function deleteRegistryItem(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registry_items")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateRegistrySurfaces(data.project_id);
}

/**
 * Writes external_registry_links on wedding_websites.
 * RLS gate is the table's existing write policy (can_access_project) — note for WRITE-01.
 */
export async function setExternalRegistryLinks(
  projectId: string,
  links: Array<{ label: string; url: string }>,
) {
  const cleaned = links
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.label && link.url);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wedding_websites")
    .update({
      external_registry_links: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .select("slug")
    .maybeSingle();

  if (error) throw error;

  revalidateRegistrySurfaces(projectId, data?.slug);
}

export async function updateClaimStatus(
  claimId: string,
  status: "reserved" | "purchased",
) {
  if (status !== "reserved" && status !== "purchased") return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registry_claims")
    .update({ status })
    .eq("id", claimId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(registryPath(data.project_id));

  const { data: website } = await supabase
    .from("wedding_websites")
    .select("slug")
    .eq("project_id", data.project_id)
    .maybeSingle();
  if (website?.slug) {
    revalidatePath(`/w/${website.slug}/registry`);
  }
}

export async function deleteClaim(claimId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registry_claims")
    .delete()
    .eq("id", claimId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(registryPath(data.project_id));

  const { data: website } = await supabase
    .from("wedding_websites")
    .select("slug")
    .eq("project_id", data.project_id)
    .maybeSingle();
  if (website?.slug) {
    revalidatePath(`/w/${website.slug}/registry`);
  }
}

