/**
 * Daily check. Builds the weekly slideshow batch on the weekday chosen in
 * Admin → Slideshows (Phoenix time), once per day.
 */
import { NextResponse } from "next/server";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { adminToday } from "@/lib/admin/today";
import { generateBatch, loadSettings } from "@/lib/admin/slideshows/run";
import { weekdayOf } from "@/lib/admin/slideshows/weekday";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return unauthorizedCronResponse();
  const settings = await loadSettings(createServiceRoleClient());
  const today = adminToday();
  if (!settings.auto_generate) return NextResponse.json({ ok: true, skipped: "auto_generate off" });
  if (weekdayOf(today) !== settings.batch_weekday) return NextResponse.json({ ok: true, skipped: "not batch day" });
  if (settings.last_batch_on === today) return NextResponse.json({ ok: true, skipped: "already ran today" });
  const result = await generateBatch("cron");
  return NextResponse.json({ ok: true, ...result });
}
