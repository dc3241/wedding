/**
 * Download a generated post straight from the review queue.
 *
 *   part=zip      every slide (slide-1.png, slide-2.png, ...) plus caption.txt
 *   part=image    the one image of a single-image post
 *   part=caption  caption.txt on its own (title, blank line, caption)
 *
 * Approve in the Ideation page calls these, then marks the post approved.
 * 404 for non-admins.
 */
import { NextResponse } from "next/server";
import { filledImagePaths } from "@/lib/admin/content-formats";
import { CONTENT_QUEUE_BUCKET } from "@/lib/admin/content-queue";
import { zipStoredFiles } from "@/lib/admin/content-queue/zip-store";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "post";
}

function captionText(pillar: string | null, caption: string | null): string {
  const title = (pillar ?? "").trim();
  const body = (caption ?? "").trim();
  return title ? `${title}\n\n${body}\n` : `${body}\n`;
}

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();
  if (!(await checkIsAdmin(supabase))) return notFound();

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const part = url.searchParams.get("part") ?? "zip";
  if (!ID_RE.test(id) || !["zip", "image", "caption"].includes(part)) return notFound();

  const { data: row, error } = await supabase
    .from("content_queue")
    .select("id, platform, pillar, caption, image_paths")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return notFound();

  const base = `${row.platform}-${slug(row.pillar ?? "")}`;
  const text = captionText(row.pillar, row.caption);
  const paths = filledImagePaths(row.image_paths);
  const headers = (type: string, filename: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  });

  if (part === "caption") {
    return new NextResponse(text, { headers: headers("text/plain; charset=utf-8", `${base}-caption.txt`) });
  }

  async function load(path: string): Promise<Buffer> {
    const { data, error: downloadError } = await supabase.storage
      .from(CONTENT_QUEUE_BUCKET)
      .download(path);
    if (downloadError || !data) throw new Error(downloadError?.message ?? "missing image");
    return Buffer.from(await data.arrayBuffer());
  }

  try {
    if (part === "image") {
      const first = paths[0];
      if (!first) return notFound();
      return new NextResponse(new Uint8Array(await load(first)), {
        headers: headers("image/png", `${base}.png`),
      });
    }

    const files = await Promise.all(
      paths.map(async (path, i) => ({ name: `slide-${i + 1}.png`, data: await load(path) })),
    );
    files.push({ name: "caption.txt", data: Buffer.from(text, "utf-8") });
    return new NextResponse(new Uint8Array(zipStoredFiles(files)), {
      headers: headers("application/zip", `${base}.zip`),
    });
  } catch (err) {
    console.error("queue-download:", err);
    return NextResponse.json({ error: "Could not load the images." }, { status: 502 });
  }
}
