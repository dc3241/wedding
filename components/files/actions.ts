"use server";

import { revalidatePath } from "next/cache";
import { COUPLE_CONTRACTS_SEGMENT } from "@/lib/project-tabs";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";
import {
  PROJECT_FILES_BUCKET,
  type FileKind,
} from "./types";

function revalidatePathsForKind(projectId: string, kind: string) {
  if (kind === "contract") {
    revalidatePath(`/projects/${projectId}/contracts`);
    revalidatePath(`/projects/${projectId}/${COUPLE_CONTRACTS_SEGMENT}`);
    revalidatePath("/contracts");
    return;
  }
  revalidatePath(`/projects/${projectId}/notes`);
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

export async function recordFile(
  projectId: string,
  meta: {
    name: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    kind: FileKind;
    category?: string | null;
    projectVendorId?: string | null;
  },
) {
  const supabase = await createClient();

  const categoryResult =
    meta.kind === "contract"
      ? resolveCategory(meta.category)
      : ({ ok: true, category: null } as const);
  if (!categoryResult.ok) {
    throw new Error(categoryResult.error);
  }

  const { error } = await supabase.from("files").insert({
    project_id: projectId,
    kind: meta.kind,
    name: meta.name.trim(),
    storage_path: meta.storagePath,
    mime_type: meta.mimeType,
    size_bytes: meta.sizeBytes,
    ...(meta.kind === "contract"
      ? { category: categoryResult.category }
      : {}),
    ...(meta.projectVendorId
      ? { project_vendor_id: meta.projectVendorId }
      : {}),
  });

  if (error) throw error;

  revalidatePathsForKind(projectId, meta.kind);
  if (meta.projectVendorId) {
    revalidatePath(`/projects/${projectId}/vendors`);
  }
}

export async function getDownloadUrl(
  fileId: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (error || !file) {
    return { error: "File not found." };
  }

  const { data, error: signError } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(file.storage_path, 60);

  if (signError || !data?.signedUrl) {
    return {
      error: signError?.message ?? "Could not create download link.",
    };
  }

  return { url: data.signedUrl };
}

export async function deleteFile(fileId: string) {
  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path, project_id, kind, project_vendor_id")
    .eq("id", fileId)
    .single();

  if (error || !file) throw error;

  const { error: storageError } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .remove([file.storage_path]);

  if (storageError) throw storageError;

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (deleteError) throw deleteError;

  revalidatePathsForKind(file.project_id, file.kind);
  if (file.project_vendor_id) {
    revalidatePath(`/projects/${file.project_id}/vendors`);
  }
}
