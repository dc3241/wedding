"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export type RegenerateGuestRsvpTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "error" };

async function assertCanEditProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_edit_project", {
    p_project_id: projectId,
  });
  return !error && data === true;
}

export async function regenerateGuestRsvpToken(
  guestId: string,
): Promise<RegenerateGuestRsvpTokenResult> {
  const supabase = await createClient();

  const { data: guest, error: lookupError } = await supabase
    .from("guests")
    .select("id, project_id")
    .eq("id", guestId)
    .maybeSingle();

  if (lookupError || !guest?.project_id) {
    return { ok: false, reason: "error" };
  }

  const projectId = String(guest.project_id);

  if (!(await assertCanEditProject(supabase, projectId))) {
    return { ok: false, reason: "forbidden" };
  }

  const token = randomBytes(16).toString("hex");

  const { error } = await supabase
    .from("guests")
    .update({ rsvp_token: token })
    .eq("id", guestId);

  if (error) {
    return { ok: false, reason: "error" };
  }

  revalidatePath(guestsPath(projectId));
  return { ok: true, token };
}
