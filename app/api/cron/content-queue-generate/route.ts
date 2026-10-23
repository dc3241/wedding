/**
 * Retired. Ideation is on-demand now — no Sunday shortlist.
 */
import { NextResponse } from "next/server";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }
  return NextResponse.json({ ok: true, skipped: true, reason: "Ideation is on-demand." });
}
