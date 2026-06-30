"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { RsvpSubmissionStatus } from "./rsvp-submissions";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export async function setRsvpSubmissionStatus(
  id: string,
  status: RsvpSubmissionStatus,
): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rsvp_submissions")
    .update({ status })
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(String(data.project_id)));
}

export async function deleteRsvpSubmission(id: string): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rsvp_submissions")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(String(data.project_id)));
}
