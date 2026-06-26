"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  PROJECT_FILES_BUCKET,
  type FileKind,
} from "./types";

function revalidatePathForKind(projectId: string, kind: string) {
  const segment = kind === "contract" ? "contracts" : "notes";
  return `/projects/${projectId}/${segment}`;
}

export async function recordFile(
  projectId: string,
  meta: {
    name: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    kind: FileKind;
  },
) {
  const supabase = await createClient();

  const { error } = await supabase.from("files").insert({
    project_id: projectId,
    kind: meta.kind,
    name: meta.name.trim(),
    storage_path: meta.storagePath,
    mime_type: meta.mimeType,
    size_bytes: meta.sizeBytes,
  });

  if (error) throw error;

  revalidatePath(revalidatePathForKind(projectId, meta.kind));
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
    .select("storage_path, project_id, kind")
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

  revalidatePath(revalidatePathForKind(file.project_id, file.kind));
}
