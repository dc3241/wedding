"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import type { DayCellStatus, DayPlatforms } from "@/lib/admin/platforms";
import { createClient } from "@/utils/supabase/server";

/**
 * Every action here is an independently reachable POST endpoint once
 * built — the /admin route gate only protects the rendered page, not
 * the action itself (Server Actions guide: "treat every action as an
 * untrusted entry point"). Each one re-checks is_admin() itself, on
 * top of the DB-level is_admin() RLS policy on every admin table.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

export async function toggleDayCell(dayId: string, platformKey: string) {
  const supabase = await requireAdmin();

  const { data: day, error } = await supabase
    .from("schedule_days")
    .select("platforms")
    .eq("id", dayId)
    .single();
  if (error || !day) throw new Error("Day not found");

  const platforms = day.platforms as DayPlatforms;
  const current = platforms[platformKey];
  if (current === "off") return;

  const next: DayCellStatus = current === "done" ? "pending" : "done";

  await supabase
    .from("schedule_days")
    .update({
      platforms: { ...platforms, [platformKey]: next },
      updated_at: new Date().toISOString(),
    })
    .eq("id", dayId);

  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
}

export async function updateDayNotes(
  dayId: string,
  field: "notes_couples" | "notes_planner",
  value: string,
) {
  const supabase = await requireAdmin();
  await supabase
    .from("schedule_days")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", dayId);
  revalidatePath("/admin/schedule");
}

export async function updateWeekPerformance(
  weekId: string,
  fields: Partial<{
    views: string;
    follower_growth: string;
    dms: string;
    signups: string;
    notes: string;
  }>,
) {
  const supabase = await requireAdmin();
  await supabase
    .from("schedule_performance")
    .upsert(
      { week_id: weekId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: "week_id" },
    );
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/performance");
  revalidatePath("/admin");
}
