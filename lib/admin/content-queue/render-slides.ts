import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { renderSatoriSlide, satoriSupports } from "@/lib/admin/content-queue/satori-slide";
import { loadProductShotDataUrls } from "@/lib/admin/content-queue/product-shot-sources";
import type { SlideSpec } from "@/lib/admin/content-queue/slide-spec";

export type StillRenderer = "satori" | "still-host";

/**
 * All seven still layouts render in-process. STILL_RENDER_URL, when set,
 * sends slides to that host — unless an admin product screenshot is
 * attached, in which case the slide is drawn here so the upload is included.
 */
export const USE_SATORI_FOR_SUPPORTED_LAYOUTS = true;

async function renderViaHost(url: string, spec: SlideSpec): Promise<Buffer> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.STILL_RENDER_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) {
    throw new Error(`Still renderer failed (${res.status}).`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 8 || bytes[0] !== 0x89) {
    throw new Error("Still renderer did not return a PNG.");
  }
  return bytes;
}

export async function renderSlidePngs(
  specs: SlideSpec[],
  shotSrcBySurface?: ReadonlyMap<string, string>,
): Promise<{ pngs: Buffer[]; renderer: StillRenderer }> {
  const host = process.env.STILL_RENDER_URL?.trim().replace(/\/$/, "");
  const hasUpload = Boolean(shotSrcBySurface && [...shotSrcBySurface.values()].some(Boolean));
  if (host && !hasUpload) {
    const pngs: Buffer[] = [];
    for (const spec of specs) pngs.push(await renderViaHost(host, spec));
    return { pngs, renderer: "still-host" };
  }

  const unsupported = specs.filter((spec) => !satoriSupports(spec.layout));
  if (!USE_SATORI_FOR_SUPPORTED_LAYOUTS || unsupported.length > 0) {
    const layouts = unsupported.map((spec) => spec.layout).join(", ");
    throw new Error(
      layouts
        ? `STILL_RENDER_URL is not configured. These layouts are not drawn in the app (${layouts}).`
        : "STILL_RENDER_URL is not configured.",
    );
  }

  const pngs: Buffer[] = [];
  for (const spec of specs) {
    const uploaded = spec.surface ? shotSrcBySurface?.get(spec.surface) : null;
    pngs.push(await renderSatoriSlide(spec, uploaded));
  }
  return { pngs, renderer: "satori" };
}

export async function renderAndStoreSlides(
  supabase: SupabaseClient,
  row: { id: string; week_of: string },
  specs: SlideSpec[],
): Promise<StillRenderer> {
  const shotSrcBySurface = await loadProductShotDataUrls(supabase, specs);
  const { pngs, renderer } = await renderSlidePngs(specs, shotSrcBySurface);
  const folder = `generated/${row.week_of}/${row.id}`;
  const stamp = Date.now().toString(36);
  const paths: string[] = [];
  for (let i = 0; i < pngs.length; i += 1) {
    const objectPath = `${folder}/${stamp}-${i}.png`;
    const { error } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).upload(objectPath, pngs[i], {
      contentType: "image/png",
      cacheControl: "0",
      upsert: false,
    });
    if (error) throw new Error(error.message);
    paths.push(objectPath);
  }
  const { error } = await supabase
    .from("content_queue")
    .update({
      image_paths: paths,
      slide_specs: specs,
      generated_by: renderer,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  await removeReplacedSlides(supabase, folder, paths);
  return renderer;
}

/** Drop earlier renders of this post. The preview URL is the object path, so
 *  overwriting 0.png left the browser on the cached file. */
async function removeReplacedSlides(
  supabase: SupabaseClient,
  folder: string,
  keep: string[],
): Promise<void> {
  const { data, error } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).list(folder);
  if (error || !data) return;
  const keepNames = new Set(keep.map((path) => path.slice(folder.length + 1)));
  const stale = data
    .filter((file) => file.name.endsWith(".png") && !keepNames.has(file.name))
    .map((file) => `${folder}/${file.name}`);
  if (stale.length === 0) return;
  try {
    await supabase.storage.from(CONTENT_QUEUE_BUCKET).remove(stale);
  } catch {
    // The new file is already saved. A leftover PNG is not a failed shuffle.
  }
}
