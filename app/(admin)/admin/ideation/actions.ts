"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  applyIdeaTargetPatch,
  isContentPostFormat,
  type IdeaTargetFields,
} from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

export async function rateIdea(id: string, rating: "up" | "down" | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").update({ rating }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export async function setIdeaComment(id: string, comment: string | null) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").update({ comment }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export type IdeaTargetPatch = Partial<IdeaTargetFields>;

function isQueuePlatform(value: unknown): value is ContentQueuePlatform {
  return value === "instagram" || value === "tiktok" || value === "pinterest";
}

function isAudience(value: unknown): value is AudienceGroup {
  return value === "couples" || value === "planner";
}

export async function setIdeaTarget(id: string, patch: IdeaTargetPatch) {
  const supabase = await requireAdmin();
  const { data: current, error: loadError } = await supabase
    .from("ideation_items")
    .select("platform, format, audience_group, carousel_slides")
    .eq("id", id)
    .single();
  if (loadError || !current) throw new Error(loadError?.message ?? "Idea not found");

  const next = applyIdeaTargetPatch(
    {
      platform: isQueuePlatform(current.platform) ? current.platform : null,
      format: isContentPostFormat(current.format) ? current.format : null,
      audience_group: isAudience(current.audience_group) ? current.audience_group : null,
      carousel_slides: current.carousel_slides ?? null,
    },
    patch,
  );

  const { error } = await supabase
    .from("ideation_items")
    .update(next)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}

export async function deleteIdea(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}
