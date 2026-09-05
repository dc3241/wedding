"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { filledImagePaths } from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_BUCKET,
  CONTENT_QUEUE_SIGNED_TTL_SECONDS,
} from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import type { ContentPlatform, ContentType } from "@/lib/admin/platforms";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

function revalidateBank() {
  revalidatePath("/admin/bank");
  revalidatePath("/admin/couples/bank");
  revalidatePath("/admin/planner/bank");
  revalidatePath("/admin");
}

export type BankItemInput = {
  platform: ContentPlatform;
  idea: string;
  type: ContentType | null;
  format: string | null;
  title: string | null;
  body: string;
  notes: string | null;
  audience_group: AudienceGroup;
};

export async function createBankItem(input: BankItemInput) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("content_bank_items").insert({
    platform: input.platform,
    idea: input.idea,
    type: input.type,
    format: input.format,
    title: input.title,
    body: input.body,
    notes: input.notes,
    audience_group: input.audience_group,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidateBank();
}

export async function updateBankItem(id: string, input: Partial<BankItemInput>) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("content_bank_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidateBank();
}

export async function deleteBankItem(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("content_bank_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateBank();
}

export async function getContentBankDownloadUrl(id: string, imageIndex: number) {
  const supabase = await requireAdmin();
  const { data: row, error: rowError } = await supabase
    .from("content_bank_items")
    .select("image_paths")
    .eq("id", id)
    .single();
  if (rowError || !row) throw new Error("Idea not found");

  const path = filledImagePaths(row.image_paths)[imageIndex];
  if (!path) throw new Error("Image not found");

  const { data, error } = await supabase.storage
    .from(CONTENT_QUEUE_BUCKET)
    .createSignedUrl(path, CONTENT_QUEUE_SIGNED_TTL_SECONDS);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create download link");
  }
  return data.signedUrl;
}
