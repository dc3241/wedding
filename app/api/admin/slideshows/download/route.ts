/**
 * POST { ids: string[] } → one zip: a folder per post with slide-N.png,
 * caption.txt, pinned-comment.txt, link.txt. Posts are marked Selected only
 * after the zip is built, so a failed download leaves them in the batch.
 */
import { NextResponse } from "next/server";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { zipStoredFiles } from "@/lib/admin/content-queue/zip-store";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { SLIDESHOW_TIKTOK_UTM } from "@/lib/admin/slideshows/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "post";
}

export async function POST(request: Request) {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string" && ID_RE.test(v)) : [];
  if (ids.length === 0 || ids.length > 20) return NextResponse.json({ error: "Pick 1–20 posts." }, { status: 400 });

  const { data: posts, error } = await supabase
    .from("slideshow_posts")
    .select("id, title, caption, pinned_comment, utm_campaign, image_paths, status")
    .in("id", ids)
    .in("status", ["candidate", "selected"]);
  if (error || !posts || posts.length === 0) return NextResponse.json({ error: "Posts not found." }, { status: 404 });

  const files: { name: string; data: Buffer }[] = [];
  try {
    let n = 0;
    for (const post of posts) {
      n += 1;
      const folder = `${String(n).padStart(2, "0")}-${slug(post.title)}`;
      const paths = (post.image_paths as string[]) ?? [];
      for (let i = 0; i < paths.length; i += 1) {
        const { data, error: dl } = await supabase.storage.from(CONTENT_QUEUE_BUCKET).download(paths[i] as string);
        if (dl || !data) throw new Error(dl?.message ?? "missing slide");
        files.push({ name: `${folder}/slide-${i + 1}.png`, data: Buffer.from(await data.arrayBuffer()) });
      }
      files.push({ name: `${folder}/caption.txt`, data: Buffer.from(`${post.title}\n\n${post.caption}\n`) });
      if (post.pinned_comment) {
        files.push({ name: `${folder}/pinned-comment.txt`, data: Buffer.from(`${post.pinned_comment}\n`) });
      }
      files.push({ name: `${folder}/link.txt`, data: Buffer.from(`${SLIDESHOW_TIKTOK_UTM(post.utm_campaign)}\n`) });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not build the zip." }, { status: 500 });
  }

  const zip = zipStoredFiles(files);
  const now = new Date().toISOString();
  await supabase
    .from("slideshow_posts")
    .update({ status: "selected", selected_at: now, downloaded_at: now, updated_at: now })
    .in("id", posts.map((p) => p.id))
    .eq("status", "candidate");

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="first-look-slideshows-${now.slice(0, 10)}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
