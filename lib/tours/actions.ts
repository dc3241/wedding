"use server";

import { createClient } from "@/utils/supabase/server";

export type TourDismissStatus = "completed" | "skipped";

/**
 * Sole writer for user_tours. Upserts by (user_id, tour_key).
 */
export async function dismissTour(
  tourKey: string,
  status: TourDismissStatus,
): Promise<void> {
  const key = tourKey.trim();
  if (!key) {
    throw new Error("tourKey is required.");
  }
  if (status !== "completed" && status !== "skipped") {
    throw new Error("Invalid tour status.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase.from("user_tours").upsert(
    {
      user_id: user.id,
      tour_key: key,
      status,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tour_key" },
  );

  if (error) throw error;
}
