/**
 * Signs one content-bank slide at request time and redirects to it.
 * Preview URLs used to be minted for the whole carousel when the page
 * rendered, then died after 60s — later slides and downloads received
 * Storage's JSON error instead of the PNG.
 */
import { NextResponse } from "next/server";
import { filledImagePaths } from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
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
  const index = Number(url.searchParams.get("index"));
  const download = url.searchParams.get("download") === "1";
  if (!ID_RE.test(id) || !Number.isInteger(index) || index < 0 || index > 20) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: row, error: rowError } = await supabase
    .from("content_bank_items")
    .select("image_paths")
    .eq("id", id)
    .maybeSingle();
  if (rowError || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const path = filledImagePaths(row.image_paths)[index];
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
