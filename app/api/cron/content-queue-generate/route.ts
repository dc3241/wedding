/**
 * CONTENT-QUEUE-02 — Friday weekly content-day batch.
 * Same CRON_SECRET bearer gate as the other /api/cron routes.
 * Creates pending rows and kicks off KIE createTask; does not wait for images.
 */
import { NextResponse } from "next/server";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { runWeeklyContentQueue } from "@/lib/admin/content-queue/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  try {
    const result = await runWeeklyContentQueue();
    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("content-queue-generate:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
