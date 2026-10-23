/**
 * On-demand post: caption + image from platform, angle, format, and notes.
 * MODEL_API_KEY stays on the server. 404 for non-admins.
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { isContentPostFormat } from "@/lib/admin/content-formats";
import { isActiveContentQueuePlatform } from "@/lib/admin/content-queue";
import { ProduceIdeaError, produceOnDemand } from "@/lib/admin/content-queue/run";
import { isPostStyle } from "@/lib/admin/content-styles";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
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

  let body: {
    platform?: string;
    format?: string;
    postStyle?: string;
    surface?: string;
    instructions?: string;
    carousel_slides?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Platform, angle, and post type are required." }, { status: 400 });
  }

  if (!isActiveContentQueuePlatform(body.platform)) {
    return NextResponse.json({ error: "Pick TikTok, Pinterest, or LinkedIn." }, { status: 400 });
  }
  if (!isContentPostFormat(body.format)) {
    return NextResponse.json({ error: "Pick a post type." }, { status: 400 });
  }
  if (!isPostStyle(body.postStyle) || body.postStyle === "tip") {
    return NextResponse.json({ error: "Pick an angle." }, { status: 400 });
  }

  try {
    const result = await produceOnDemand({
      platform: body.platform,
      format: body.format,
      postStyle: body.postStyle,
      surface: typeof body.surface === "string" ? body.surface : null,
      instructions: typeof body.instructions === "string" ? body.instructions : null,
      carousel_slides: typeof body.carousel_slides === "number" ? body.carousel_slides : null,
    });
    if (!result.queueId || result.inserted === 0) {
      const detail = result.errors[0] ?? "Could not generate this post.";
      return NextResponse.json({ error: detail, ...result }, { status: 502 });
    }
    revalidatePath("/admin/ideation");
    revalidatePath("/admin");
    return NextResponse.json({
      ok: result.errors.length === 0,
      error: result.errors[0],
      ...result,
    });
  } catch (err) {
    if (err instanceof ProduceIdeaError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Could not generate this post.";
    console.error("ideation-generate:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
