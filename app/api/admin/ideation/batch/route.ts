/**
 * "Generate 10 ideas": reads the founders' notes on what's working and writes
 * a batch of ideas for one platform. MODEL_API_KEY stays on the server.
 * 404 for non-admins.
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { isActiveContentQueuePlatform } from "@/lib/admin/content-queue";
import { generateIdeaBatch, SIGNAL_MAX_CHARS } from "@/lib/admin/ideation/batch";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await checkIsAdmin(supabase))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { platform?: string; signal?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Platform is required." }, { status: 400 });
  }
  if (!isActiveContentQueuePlatform(body.platform)) {
    return NextResponse.json({ error: "Pick TikTok, Pinterest, or LinkedIn." }, { status: 400 });
  }
  const signal = typeof body.signal === "string" ? body.signal : "";
  if (signal.length > SIGNAL_MAX_CHARS * 2) {
    return NextResponse.json({ error: "Notes are too long. Trim them down." }, { status: 400 });
  }

  try {
    const ideas = await generateIdeaBatch(supabase, {
      platform: body.platform,
      signal,
      requestedBy: user.id,
    });
    revalidatePath("/admin/ideation");
    return NextResponse.json({ ok: true, ideas });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate ideas.";
    console.error("ideation-batch:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
