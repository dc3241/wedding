import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { renderSatoriSlide, satoriSupports } from "@/lib/admin/content-queue/satori-slide";
import type { SlideSpec } from "@/lib/admin/content-queue/slide-spec";

export type StillRenderer = "satori" | "still-host";

/**
 * Headline-card and headline-phone render in-process. The pin-size check
 * (stills/satori-check) kept the type on the frame, the phone bezel and
 * inner clip, and a visible soft shadow. Other layouts need STILL_RENDER_URL.
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
): Promise<{ pngs: Buffer[]; renderer: StillRenderer }> {
  const host = process.env.STILL_RENDER_URL?.trim().replace(/\/$/, "");
  if (host) {
    const pngs: Buffer[] = [];
    for (const spec of specs) pngs.push(await renderViaHost(host, spec));
    return { pngs, renderer: "still-host" };
  }

  const unsupported = specs.filter((spec) => !satoriSupports(spec.layout));
  if (!USE_SATORI_FOR_SUPPORTED_LAYOUTS || unsupported.length > 0) {
    const layouts = unsupported.map((spec) => spec.layout).join(", ");
    throw new Error(
      layouts
        ? `STILL_RENDER_URL is not configured. Satori only covers headline-card and headline-phone (this post needs ${layouts}).`
        : "STILL_RENDER_URL is not configured.",
    );
  }

  const pngs: Buffer[] = [];
  for (const spec of specs) pngs.push(await renderSatoriSlide(spec));
  return { pngs, renderer: "satori" };
}

export async function renderAndStoreSlides(
  supabase: SupabaseClient,
  row: { id: string; week_of: string },
  specs: SlideSpec[],
): Promise<StillRenderer> {
  const { pngs, renderer } = await renderSlidePngs(specs);
  const paths: string[] = [];
  for (let i = 0; i < pngs.length; i += 1) {
    const objectPath = `generated/${row.week_of}/${row.id}/${i}.png`;
    const { error } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).upload(objectPath, pngs[i], {
      contentType: "image/png",
      upsert: true,
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
  return renderer;
}
