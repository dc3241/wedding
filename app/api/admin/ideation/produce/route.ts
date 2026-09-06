/**
 * Admin ideation — "Produce now" action. Same Friday pipeline
 * (Anthropic copy + optional KIE) for a single liked, tagged idea.
 * MODEL_API_KEY never reaches the browser. 404 for non-admins.
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  ProduceIdeaError,
  produceIdeaNow,
} from "@/lib/admin/content-queue/run";
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

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Idea id is required." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Idea id is required." }, { status: 400 });
  }

  try {
    const result = await produceIdeaNow(id);
    if (!result.queueId || result.inserted === 0) {
      const detail = result.errors[0] ?? "Could not produce this idea.";
      return NextResponse.json({ error: detail, ...result }, { status: 502 });
    }
    revalidatePath("/admin/ideation");
    revalidatePath("/admin/content-queue");
    revalidatePath("/admin");
    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result,
    });
  } catch (err) {
    if (err instanceof ProduceIdeaError) {
      const status =
        err.code === "not_found" ? 404 : err.code === "already_used" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Produce failed.";
    console.error("ideation-produce:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
