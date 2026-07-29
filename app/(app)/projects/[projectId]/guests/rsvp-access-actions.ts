"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export type RsvpAccessMode = "open" | "gated";

export type SetRsvpAccessModeResult =
  | { ok: true }
  | { ok: false; reason: "no_website" }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "error" };

export type RegenerateGuestRsvpTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "forbidden" }
  | { ok: false; reason: "error" };

function isRsvpAccessMode(value: string): value is RsvpAccessMode {
  return value === "open" || value === "gated";
}

async function assertCanEditProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_edit_project", {
    p_project_id: projectId,
  });
  return !error && data === true;
}

export async function setRsvpAccessMode(
  projectId: string,
  mode: string,
): Promise<SetRsvpAccessModeResult> {
  if (!isRsvpAccessMode(mode)) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createClient();

  if (!(await assertCanEditProject(supabase, projectId))) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: website, error: lookupError } = await supabase
    .from("wedding_websites")
    .select("project_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, reason: "error" };
  }

  if (!website) {
    return { ok: false, reason: "no_website" };
  }

  const { error } = await supabase
    .from("wedding_websites")
    .update({
      rsvp_access_mode: mode,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, reason: "error" };
  }

  revalidatePath(guestsPath(projectId));
  return { ok: true };
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
