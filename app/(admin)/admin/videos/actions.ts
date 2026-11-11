"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { normalizeSegments } from "@/lib/admin/videos/script";
import { VIDEO_BUCKET } from "@/lib/admin/videos/types";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) throw new Error("Not authorized");
  return supabase;
}

const uuid = z.string().uuid();

export async function discardVideo(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("video_posts")
    .update({ stage: "discarded", updated_at: new Date().toISOString() })
    .eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/videos");
}

const saveSchema = z.object({
  title: z.string().trim().min(1).max(120),
  caption: z.string().max(2200),
  pinned_comment: z.string().max(1000),
  script: z.array(z.unknown()).max(30),
});

/** Saves the edited script. Spoken-text edits invalidate the voiceover (checked at render time). */
export async function saveVideoScript(id: string, input: z.infer<typeof saveSchema>) {
  const supabase = await requireAdmin();
  const parsed = saveSchema.parse(input);
  const { error } = await supabase
    .from("video_posts")
    .update({
      title: parsed.title,
      caption: parsed.caption,
      pinned_comment: parsed.pinned_comment,
      script: normalizeSegments(parsed.script),
      updated_at: new Date().toISOString(),
    })
    .eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/videos");
}

const footageSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600),
  feature: z.string().trim().max(40),
  path: z.string().min(5).max(300).startsWith("footage/"),
  media_type: z.enum(["video", "image"]),
  size_bytes: z.number().int().min(0).nullable(),
  duration_sec: z.number().min(0).max(36000).nullable(),
});

/** Registers a file the browser already uploaded to video-assets/footage/. */
export async function registerFootage(input: z.infer<typeof footageSchema>): Promise<{ id: string }> {
  const supabase = await requireAdmin();
  const parsed = footageSchema.parse(input);
  const { data, error } = await supabase
    .from("video_footage")
    .insert({ ...parsed, tags: [] })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the footage.");
  revalidatePath("/admin/videos");
  return { id: String(data.id) };
}

export async function deleteFootage(id: string) {
  const supabase = await requireAdmin();
  const clipId = uuid.parse(id);
  const { data } = await supabase.from("video_footage").select("path").eq("id", clipId).maybeSingle();
  const { error } = await supabase.from("video_footage").delete().eq("id", clipId);
  if (error) throw new Error(error.message);
  if (data?.path) await supabase.storage.from(VIDEO_BUCKET).remove([String(data.path)]);
  revalidatePath("/admin/videos");
}
