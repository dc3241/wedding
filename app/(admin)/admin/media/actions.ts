"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { ADMIN_MEDIA_BUCKET } from "@/lib/admin/media";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

/**
 * Signed upload token (createSignedUploadUrl) for one object path — the
 * client then does a TUS resumable upload to Supabase Storage's
 * /storage/v1/upload/resumable endpoint with this token in the
 * `x-signature` header. Never a raw service-role upload — this token is
 * scoped to exactly one path, and only an admin can mint one.
 */
export async function createMediaUploadToken(storagePath: string) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.storage
    .from(ADMIN_MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) throw new Error(error?.message ?? "Could not create upload token");
  return { token: data.token, path: data.path };
}

export async function recordMediaAsset(input: {
  filename: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
}) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("media_assets").insert({
    filename: input.filename,
    storage_path: input.storagePath,
    file_size: input.fileSize,
    content_type: input.contentType,
    uploaded_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/media");
  revalidatePath("/admin");
}

export async function getMediaDownloadUrl(assetId: string) {
  const supabase = await requireAdmin();
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .select("storage_path")
    .eq("id", assetId)
    .single();
  if (assetError || !asset) throw new Error("File not found");

  const { data, error } = await supabase.storage
    .from(ADMIN_MEDIA_BUCKET)
    .createSignedUrl(asset.storage_path, 60);
  if (error || !data) throw new Error(error?.message ?? "Could not create download link");
  return data.signedUrl;
}

export async function updateMediaAsset(
  assetId: string,
  fields: Partial<{ status: "new" | "in_progress" | "ready" | "posted"; notes: string | null }>,
) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("media_assets").update(fields).eq("id", assetId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/media");
}

export async function deleteMediaAsset(assetId: string) {
  const supabase = await requireAdmin();
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .select("storage_path")
    .eq("id", assetId)
    .single();
  if (assetError || !asset) throw new Error("File not found");

  await supabase.storage.from(ADMIN_MEDIA_BUCKET).remove([asset.storage_path]);

  const { error } = await supabase.from("media_assets").delete().eq("id", assetId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/media");
  revalidatePath("/admin");
}
