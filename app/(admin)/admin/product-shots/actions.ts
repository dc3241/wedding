"use server";

import { revalidatePath } from "next/cache";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import {
  MAX_PRODUCT_SHOT_BYTES,
  PRODUCT_SHOT_LIBRARY_PREFIX,
  productShotExtension,
} from "@/lib/admin/content-queue/product-shot-library";
import { PRODUCT_SHOT_SLUGS } from "@/lib/admin/content-queue/product-shots";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

const SURFACES = new Set<string>(PRODUCT_SHOT_SLUGS);

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

function assertUpload(input: {
  surface: string;
  storagePath: string;
  fileSize: number;
  contentType: string;
  filename: string;
}) {
  if (!SURFACES.has(input.surface)) throw new Error("Unknown angle.");
  if (input.fileSize > MAX_PRODUCT_SHOT_BYTES) {
    throw new Error("File is too large. Maximum size is 20MB.");
  }
  if (!productShotExtension(input.filename, input.contentType)) {
    throw new Error("Use a PNG, JPG, or WebP.");
  }
  const prefix = `${PRODUCT_SHOT_LIBRARY_PREFIX}/${input.surface}/`;
  if (!input.storagePath.startsWith(prefix) || input.storagePath.includes("..")) {
    throw new Error("Invalid upload.");
  }
}

export async function recordProductShotUpload(input: {
  surface: string;
  storagePath: string;
  filename: string;
  fileSize: number;
  contentType: string;
}) {
  assertUpload(input);
  const supabase = await requireAdmin();

  const { error: signError } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrl(input.storagePath, 60);
  if (signError) throw new Error("Upload did not land in storage.");

  const { data: existing } = await supabase
    .from("product_shot_uploads")
    .select("storage_path")
    .eq("surface", input.surface)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("product_shot_uploads").upsert(
    {
      surface: input.surface,
      storage_path: input.storagePath,
      filename: input.filename,
      content_type: input.contentType,
      file_size: input.fileSize,
      uploaded_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "surface" },
  );
  if (error) throw new Error(error.message);

  const previous = existing?.storage_path;
  if (previous && previous !== input.storagePath) {
    await supabase.storage.from(CONTENT_QUEUE_BUCKET).remove([previous]);
  }

  revalidatePath("/admin/product-shots");
}

export async function clearProductShotUpload(surface: string) {
  if (!SURFACES.has(surface)) throw new Error("Unknown angle.");
  const supabase = await requireAdmin();
  const { data: row, error: rowError } = await supabase
    .from("product_shot_uploads")
    .select("storage_path")
    .eq("surface", surface)
    .maybeSingle();
  if (rowError) throw new Error(rowError.message);
  if (!row) return;

  await supabase.storage.from(CONTENT_QUEUE_BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from("product_shot_uploads").delete().eq("surface", surface);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/product-shots");
}
