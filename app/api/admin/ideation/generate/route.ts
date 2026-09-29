/**
 * Admin ideation — week shortlists. Sunday cron and the Generate button
 * both call generateContentWeek. MODEL_API_KEY stays on the server.
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { isContentLane } from "@/lib/admin/content-week";
import { generateContentWeek } from "@/lib/admin/content-week/ideas";
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

  let body: { date?: string; lane?: string; focus?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const date = typeof body.date === "string" ? body.date : null;
  const lane = isContentLane(body.lane) ? body.lane : null;
  if (body.lane && !lane) {
    return NextResponse.json({ error: "Unknown post type." }, { status: 400 });
  }
  if (lane && !date) {
    return NextResponse.json({ error: "Pick a day to regenerate." }, { status: 400 });
  }

  try {
    const result = await generateContentWeek(supabase, {
      requestedBy: user.id,
      date,
      lane,
      focus: typeof body.focus === "string" ? body.focus : null,
    });
    revalidatePath("/admin/ideation");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate ideas.";
    console.error("ideation-generate:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
