/**
 * Signs one content-bank slide at request time and redirects to it.
 * Preview URLs used to be minted for the whole carousel when the page
 * rendered, then died after 60s — later slides and downloads received
 * Storage's JSON error instead of the PNG.
 *
 * download=all returns every slide in one zip, in order. TikTok
 * slideshows use that so one click saves the set.
 */
import { NextResponse } from "next/server";
import { filledImagePaths } from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
import { zipStoredFiles } from "@/lib/admin/content-queue/zip-store";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slideFilename(path: string, index: number): string {
  const base = path.split("/").pop()?.trim() || `slide-${index + 1}.png`;
  return base.replace(/[^\w.\-]+/g, "_");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const downloadAll = url.searchParams.get("download") === "all";
  const index = Number(url.searchParams.get("index"));
  const download = url.searchParams.get("download") === "1";
  if (!ID_RE.test(id) || (!downloadAll && (!Number.isInteger(index) || index < 0 || index > 20))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: row, error: rowError } = await supabase
    .from("content_bank_items")
    .select("platform, image_paths")
    .eq("id", id)
    .maybeSingle();
  if (rowError || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paths = filledImagePaths(row.image_paths);
  if (downloadAll) {
    if (row.platform !== "tiktok" || paths.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let files: { name: string; data: Buffer }[];
    try {
      files = await Promise.all(
        paths.map(async (path, i) => {
          const { data, error } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).download(path);
          if (error || !data) throw new Error(error?.message ?? "missing slide");
          return {
            name: `slide-${i + 1}.png`,
            data: Buffer.from(await data.arrayBuffer()),
          };
        }),
      );
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const zip = zipStoredFiles(files);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="tiktok-slides.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  }

  const path = paths[index];
  if (!path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrl(
      path,
      CONTENT_QUEUE_SIGNED_TTL_SECONDS,
      download ? { download: slideFilename(path, index) } : undefined,
    );
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
