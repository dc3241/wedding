"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function notesPath(projectId: string) {
  return `/projects/${projectId}/notes`;
}

export async function addNote(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .insert({ project_id: projectId })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath(notesPath(projectId));

  return data.id;
}

export async function updateNote(
  noteId: string,
  fields: { title?: string; body?: string },
) {
  const updates: Record<string, string | null> = {};

  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    if (!trimmed) return;
    updates.title = trimmed;
  }

  if (fields.body !== undefined) {
    updates.body = fields.body.trim() || null;
  }

  if (Object.keys(updates).length === 0) return;

  updates.updated_at = new Date().toISOString();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .update(updates)
    .eq("id", noteId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(notesPath(data.project_id));
}

export async function removeNote(noteId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(notesPath(data.project_id));
}
