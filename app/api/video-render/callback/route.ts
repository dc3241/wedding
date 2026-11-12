/**
 * The GitHub Actions renderer reports back here. Not a logged-in route: it is
 * authorised by the one-time token generated when the render was started
 * (video_posts.render_token), which only the render job's file contains.
 */
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { post_id?: unknown; token?: unknown; status?: unknown; error?: unknown } | null;
  const id = typeof body?.post_id === "string" ? body.post_id : "";
  const token = typeof body?.token === "string" ? body.token : "";
  if (!ID_RE.test(id) || token.length < 20) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createServiceRoleClient();
  const { data: post } = await supabase.from("video_posts").select("id, render_token, render_status").eq("id", id).maybeSingle();
  if (!post || post.render_token !== token || post.render_status !== "rendering") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  if (body?.status === "done") {
    await supabase
      .from("video_posts")
      .update({ render_status: "done", video_path: `renders/${id}/final.mp4`, rendered_at: now, render_token: null, render_error: null, updated_at: now })
      .eq("id", id);
  } else {
    const message = typeof body?.error === "string" ? body.error.slice(0, 800) : "The render failed.";
    await supabase
      .from("video_posts")
      .update({ render_status: "failed", render_error: message, render_token: null, updated_at: now })
      .eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
