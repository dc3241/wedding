/**
 * VND-SHARE-04 — email vendors when shared details change.
 * Hourly. Same CRON_SECRET bearer gate as AUTO-01 / AUTO-02.
 */
import { NextResponse } from "next/server";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { runVendorShareChangeNotify } from "@/lib/cron/vendor-share-changes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await runVendorShareChangeNotify();
    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("vendor-share-changes:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
