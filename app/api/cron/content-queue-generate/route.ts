/**
 * Sunday content-week shortlist. 15:35 UTC = 8:35am America/Phoenix.
 * Fills Monday–Saturday idea slots. Does not render images — Produce still does that.
 */
import { NextResponse } from "next/server";
import { generateContentWeek } from "@/lib/admin/content-week/ideas";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  try {
    const result = await generateContentWeek(createServiceRoleClient());
    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("content-week-ideas:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
