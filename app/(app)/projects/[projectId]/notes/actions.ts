"use server";

import { revalidatePath } from "next/cache";
import type { NoteActionStatus } from "./types";
import { createClient } from "@/utils/supabase/server";
import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";

function notesPath(projectId: string) {
  return `/projects/${projectId}/notes`;
}

export async function addNote(
  projectId: string,
  client?: SupabaseClient,
  actionStatus?: NoteActionStatus,
) {
  const supabase = await clientForWrite(client);

  const row: {
    project_id: string;
    created_by?: null;
    action_status?: "needs_action" | "done";
  } = { project_id: projectId };

  if (client) {
    row.created_by = null;
  }
  if (actionStatus === "needs_action" || actionStatus === "done") {
    row.action_status = actionStatus;
  }

  const { data, error } = await supabase
    .from("notes")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath(notesPath(projectId));

  return data.id;
}

export async function updateNote(
  noteId: string,
  fields: {
    title?: string;
    body?: string;
    action_status?: NoteActionStatus;
  },
  client?: SupabaseClient,
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

  if (fields.action_status !== undefined) {
    updates.action_status = fields.action_status;
  }

  if (Object.keys(updates).length === 0) return;

  updates.updated_at = new Date().toISOString();

  const supabase = await clientForWrite(client);

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
