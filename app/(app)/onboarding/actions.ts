"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type OnboardingFields = {
  weddingDate: string | null;
  location: string;
  guestEstimate: number | null;
  totalBudget: number | null;
  style: string;
  traditions: string;
  priorities: string;
  vibeNotes: string;
};

export async function saveOnboarding(
  projectId: string,
  fields: OnboardingFields,
) {
  const supabase = await createClient();

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      wedding_date: fields.weddingDate || null,
      total_budget: fields.totalBudget,
    })
    .eq("id", projectId);

  if (projectError) throw projectError;

  const { error: profileError } = await supabase.from("wedding_profile").upsert(
    {
      project_id: projectId,
      location: fields.location.trim() || null,
      guest_estimate: fields.guestEstimate,
      style: fields.style.trim() || null,
      traditions: fields.traditions.trim() || null,
      priorities: fields.priorities.trim() || null,
      vibe_notes: fields.vibeNotes.trim() || null,
    },
    { onConflict: "project_id" },
  );

  if (profileError) throw profileError;

  revalidatePath("/onboarding");
  revalidatePath(`/projects/${projectId}`);
}
