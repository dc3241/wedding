import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import type { SlideSpec } from "@/lib/admin/content-queue/slide-spec";

type UploadRow = {
  surface: string;
  storage_path: string;
  content_type: string | null;
};

/** Data URLs for angles that have an admin upload. Missing bytes fail the render. */
export async function loadProductShotDataUrls(
  supabase: SupabaseClient,
  specs: SlideSpec[],
): Promise<Map<string, string>> {
  const surfaces = [
    ...new Set(
      specs.flatMap((spec) => [spec.surface, spec.snippet]).filter((surface): surface is string => Boolean(surface)),
    ),
  ];
  const out = new Map<string, string>();
  if (surfaces.length === 0) return out;

  const { data, error } = await supabase
    .from("product_shot_uploads")
    .select("surface, storage_path, content_type")
    .in("surface", surfaces);
  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as UploadRow[]) {
    const { data: file, error: downloadError } = await supabase.storage
      .from(CONTENT_QUEUE_BUCKET)
      .download(row.storage_path);
    if (downloadError || !file) {
      throw new Error(
        `Product screenshot for ${row.surface} is missing from storage. Re-upload it on Product screens.`,
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = row.content_type?.startsWith("image/") ? row.content_type : "image/png";
    out.set(row.surface, `data:${mime};base64,${bytes.toString("base64")}`);
  }
  return out;
}

export async function uploadedProductShotPath(
  supabase: SupabaseClient,
  surface: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("product_shot_uploads")
    .select("storage_path")
    .eq("surface", surface)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.storage_path as string | undefined) ?? null;
}
