"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
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
