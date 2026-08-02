"use server";

import { revalidatePath } from "next/cache";
import {
  isMealServiceStyle,
  type MealServiceStyle,
} from "./meal-types";
import { createWeddingWebsite } from "../website/actions";
import { createClient } from "@/utils/supabase/server";

function guestsPath(projectId: string) {
  return `/projects/${projectId}/guests`;
}

export type SetMealServiceStyleResult =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "error" };

export async function setMealServiceStyle(
  projectId: string,
  style: string,
): Promise<SetMealServiceStyleResult> {
  if (!isMealServiceStyle(style)) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createClient();

  const { data: website, error: lookupError } = await supabase
    .from("wedding_websites")
    .select("project_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, reason: "error" };
  }

  if (!website) {
    const created = await createWeddingWebsite(projectId);
    if (!created.ok) {
      return { ok: false, reason: "error" };
    }
  }

  const { error } = await supabase
    .from("wedding_websites")
    .update({
      meal_service_style: style as MealServiceStyle,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) {
    return { ok: false, reason: "error" };
  }

  revalidatePath(guestsPath(projectId));
  return { ok: true };
}

export async function addMealOption(
  projectId: string,
  fields: {
    name: string;
    description?: string;
    is_kids?: boolean;
    sort_order?: number;
  },
) {
  const name = fields.name.trim();
  if (!name) return;

  const supabase = await createClient();

  const { error } = await supabase.from("meal_options").insert({
    project_id: projectId,
    name,
    description: fields.description?.trim() || null,
    is_kids: Boolean(fields.is_kids),
    sort_order:
      fields.sort_order === undefined
        ? 0
        : Math.floor(Number(fields.sort_order) || 0),
  });

  if (error) throw error;

  revalidatePath(guestsPath(projectId));
}

export async function updateMealOption(
  id: string,
  fields: {
    name?: string;
    description?: string | null;
    is_kids?: boolean;
    sort_order?: number;
  },
) {
  const updates: Record<string, string | number | boolean | null> = {};

  if (fields.name !== undefined) {
    const trimmed = fields.name.trim();
    if (!trimmed) return;
    updates.name = trimmed;
  }

  if (fields.description !== undefined) {
    updates.description =
      fields.description === null
        ? null
        : fields.description.trim() || null;
  }

  if (fields.is_kids !== undefined) {
    updates.is_kids = Boolean(fields.is_kids);
  }

  if (fields.sort_order !== undefined) {
    updates.sort_order = Math.floor(Number(fields.sort_order) || 0);
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meal_options")
    .update(updates)
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}

export async function deleteMealOption(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meal_options")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(guestsPath(data.project_id));
}
