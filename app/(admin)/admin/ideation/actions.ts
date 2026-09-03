"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
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

export async function deleteIdea(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("ideation_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/ideation");
}
