"use server";

import { revalidatePath } from "next/cache";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import {
  isFormality,
  type Formality,
} from "@/lib/wedding-formality";
import { createClient } from "@/utils/supabase/server";

export type OnboardingFields = {
  weddingDate: string | null;
  location: string;
  guestEstimate: number | null;
  totalBudget: number | null;
  style: string;
  priorities: string;
  vibeNotes: string;
  includeBudget: boolean;
  includeChecklist: boolean;
  includeVendors: boolean;
  formality: Formality | null;
  priorityVendorCategoryIds: string[];
  alreadyBookedVendorCategoryIds: string[];
};

function normalizeFormality(value: string | null): Formality | null {
  if (!value) return null;
  return isFormality(value) ? value : null;
}

/** Defense-in-depth ahead of the DB CHECK — mirrors commitPlan category filter. */
function filterVendorCategoryIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const raw of ids) {
    const id = raw.trim();
    if (!getVendorCategoryById(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    kept.push(id);
  }

  return kept;
}

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
      priorities: fields.priorities.trim() || null,
      vibe_notes: fields.vibeNotes.trim() || null,
      include_budget: fields.includeBudget,
      include_checklist: fields.includeChecklist,
      include_vendors: fields.includeVendors,
      formality: normalizeFormality(fields.formality),
      priority_vendor_category_ids: filterVendorCategoryIds(
        fields.priorityVendorCategoryIds,
      ),
      already_booked_vendor_category_ids: filterVendorCategoryIds(
        fields.alreadyBookedVendorCategoryIds,
      ),
    },
    { onConflict: "project_id" },
  );

  if (profileError) throw profileError;

  revalidatePath("/onboarding");
  revalidatePath(`/projects/${projectId}`);
}
