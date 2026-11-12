/** One zip: the finished MP4 plus caption.txt (title, caption, pinned comment, tracked link). */
import { NextResponse } from "next/server";
import { zipStoredFiles } from "@/lib/admin/content-queue/zip-store";
import { adminOr404 } from "@/lib/admin/slideshows/auth";
import { SLIDESHOW_TIKTOK_UTM } from "@/lib/admin/slideshows/types";
import { VIDEO_BUCKET } from "@/lib/admin/videos/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "video";
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await adminOr404();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: post } = await auth.supabase
    .from("video_posts")
    .select("title, caption, pinned_comment, utm_campaign, video_path")
    .eq("id", id)
    .maybeSingle();
  if (!post?.video_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: file, error } = await auth.supabase.storage.from(VIDEO_BUCKET).download(post.video_path);
  if (error || !file) return NextResponse.json({ error: "Could not read the video." }, { status: 500 });

  const base = slug(post.title);
  const caption = [post.title, "", post.caption, post.pinned_comment ? `\nPinned comment: ${post.pinned_comment}` : "", `\nLink: ${SLIDESHOW_TIKTOK_UTM(post.utm_campaign || "video")}`]
    .join("\n")
    .trim();
  const zip = zipStoredFiles([
    { name: `${base}.mp4`, data: Buffer.from(await file.arrayBuffer()) },
    { name: `${base}-caption.txt`, data: Buffer.from(`${caption}\n`) },
  ]);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
