"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const CONTRACT_STATUSES = ["draft", "sent", "signed"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export async function updateContractStatus(
  fileId: string,
  status: ContractStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!CONTRACT_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const supabase = await createClient();

  const { data: file, error } = await supabase
    .from("files")
    .update({ status })
    .eq("id", fileId)
    .select("project_id")
    .single();

  if (error || !file) {
    return { ok: false, error: error?.message ?? "Could not update status." };
  }

  revalidatePath(`/projects/${file.project_id}/contracts`);
  return { ok: true };
}
