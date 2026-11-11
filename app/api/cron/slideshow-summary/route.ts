/** Daily check. Writes the weekly readout on the chosen weekday (Phoenix time). */
import { NextResponse } from "next/server";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { adminToday } from "@/lib/admin/today";
import { loadSettings } from "@/lib/admin/slideshows/run";
import { generateWeeklySummary } from "@/lib/admin/slideshows/summary";
import { weekdayOf } from "@/lib/admin/slideshows/weekday";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return unauthorizedCronResponse();
  const settings = await loadSettings(createServiceRoleClient());
  const today = adminToday();
  if (weekdayOf(today) !== settings.summary_weekday) return NextResponse.json({ ok: true, skipped: "not summary day" });
  if (settings.last_summary_on === today) return NextResponse.json({ ok: true, skipped: "already ran today" });
  const result = await generateWeeklySummary();
  return NextResponse.json({ ok: !("error" in result), ...result });
}
