"use server";

import { revalidatePath } from "next/cache";
import {
  loadWeddingDateSyncContext,
  nextProjectNameForWeddingDate,
  patchWebsiteHeroForWeddingDateChange,
} from "@/lib/sync-wedding-date-fields";
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
  const ctx = await loadWeddingDateSyncContext(supabase, projectId);
  const nextDate = fields.weddingDate || null;
  const nextName = ctx
    ? nextProjectNameForWeddingDate({
        currentName: ctx.name,
        previousDate: ctx.weddingDate,
        nextDate,
        accountName: ctx.accountName,
        preferAccountName: ctx.preferAccountName,
      })
    : null;

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      wedding_date: nextDate,
      total_budget: fields.totalBudget,
      ...(nextName && nextName !== ctx?.name ? { name: nextName } : {}),
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

  if (ctx && nextName) {
    await patchWebsiteHeroForWeddingDateChange(supabase, {
      projectId,
      previousName: ctx.name,
      previousDate: ctx.weddingDate,
      nextName,
      nextDate,
    });
  }

  revalidatePath("/onboarding");
  revalidatePath(`/projects/${projectId}`);
}
