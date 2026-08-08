"use server";

import { revalidatePath } from "next/cache";
import { COUPLE_CONTRACTS_SEGMENT } from "@/lib/project-tabs";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

function revalidateContractSurfaces(projectId: string) {
  revalidatePath(`/projects/${projectId}/contracts`);
  revalidatePath(`/projects/${projectId}/${COUPLE_CONTRACTS_SEGMENT}`);
  revalidatePath("/contracts");
}

const CONTRACT_STATUSES = ["draft", "sent", "signed"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

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

export async function updateContractStatus(
  fileId: string,
  status: ContractStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!CONTRACT_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .update({ status })
    .eq("id", fileId)
    .select("project_id")
    .single();

  if (error || !file) {
    return { ok: false, error: error?.message ?? "Could not update status." };
  }

  revalidateContractSurfaces(file.project_id);
  return { ok: true };
}

export async function setFileCategory(
  fileId: string,
  category: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const categoryResult = resolveCategory(category);
  if (!categoryResult.ok) {
    return categoryResult;
  }

  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .update({ category: categoryResult.category })
    .eq("id", fileId)
    .eq("kind", "contract")
    .select("project_id")
    .single();

  if (error || !file) {
    return {
      ok: false,
      error: error?.message ?? "Could not update category.",
    };
  }

  revalidateContractSurfaces(file.project_id);
  return { ok: true };
}
