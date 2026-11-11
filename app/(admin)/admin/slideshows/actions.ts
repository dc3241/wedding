"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized");
  return supabase;
}

const settingsSchema = z.object({
  batch_weekday: z.number().int().min(0).max(6),
  batch_size: z.number().int().min(4).max(20),
  engagement_share: z.number().min(0.2).max(0.8),
  summary_weekday: z.number().int().min(0).max(6),
  auto_generate: z.boolean(),
});

export async function saveSlideshowSettings(input: z.infer<typeof settingsSchema>) {
  const supabase = await requireAdmin();
  const parsed = settingsSchema.parse(input);
  const { error } = await supabase
    .from("slideshow_settings")
    .upsert({ id: 1, ...parsed, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/slideshows");
}

export async function discardSlideshowPost(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("slideshow_posts")
    .update({ status: "discarded", updated_at: new Date().toISOString() })
    .eq("id", z.string().uuid().parse(id))
    .eq("status", "candidate");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/slideshows");
}

const count = z.number().int().min(0).max(1_000_000_000).nullable();
const resultSchema = z.object({
  post_url: z.string().trim().max(500).nullable(),
  views: count,
  likes: count,
  comments: count,
  shares: count,
  saves: count,
  link_clicks: count,
  signups: count,
  notes: z.string().trim().max(1000).nullable(),
  posted_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function saveSlideshowResults(postId: string, input: z.infer<typeof resultSchema>) {
  const supabase = await requireAdmin();
  const id = z.string().uuid().parse(postId);
  const { posted_on, ...result } = resultSchema.parse(input);
  const { error } = await supabase
    .from("slideshow_results")
    .upsert({ post_id: id, ...result, updated_at: new Date().toISOString() }, { onConflict: "post_id" });
  if (error) throw new Error(error.message);
  if (posted_on) {
    await supabase.from("slideshow_posts").update({ posted_on }).eq("id", id);
  }
  revalidatePath("/admin/slideshows");
}

export async function saveSlideshowDirection(body: string, summaryId: string | null, source: "reply" | "note" = "reply") {
  const supabase = await requireAdmin();
  const text = z.string().trim().min(3).max(1500).parse(body);
  const { error } = await supabase.from("slideshow_direction").insert({
    summary_id: summaryId ? z.string().uuid().parse(summaryId) : null,
    source,
    body: text,
    active: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/slideshows");
}

export async function archiveSlideshowDirection(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("slideshow_direction")
    .update({ active: false })
    .eq("id", z.string().uuid().parse(id));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/slideshows");
}
