"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  dueDateFromWedding,
  STARTER_TASKS,
} from "./starter-tasks";

function checklistPath(projectId: string) {
  return `/projects/${projectId}/checklist`;
}

async function maxPosition(projectId: string, phase: string | null) {
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1);

  query =
    phase === null ? query.is("phase", null) : query.eq("phase", phase);

  const { data } = await query.maybeSingle();
  return (data?.position ?? -1) + 1;
}

export async function addTask(
  projectId: string,
  phase: string | null,
  title: string,
  dueDate?: string | null,
) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: trimmed,
    phase,
    due_date: dueDate ?? null,
    position: await maxPosition(projectId, phase),
  });

  if (error) throw error;

  revalidatePath(checklistPath(projectId));
}

export async function toggleTask(taskId: string, nextStatus: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(checklistPath(data.project_id));
}

export async function updateTaskTitle(taskId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({ title: trimmed })
    .eq("id", taskId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(checklistPath(data.project_id));
}

export async function generateStarterChecklist(projectId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (count && count > 0) return;

  const { data: project } = await supabase
    .from("projects")
    .select("wedding_date")
    .eq("id", projectId)
    .single();

  const weddingDate = project?.wedding_date ?? null;
  const phasePositions = new Map<string, number>();

  const rows = STARTER_TASKS.map((task) => {
    const position = phasePositions.get(task.phase) ?? 0;
    phasePositions.set(task.phase, position + 1);

    const due_date =
      weddingDate !== null ? dueDateFromWedding(weddingDate, task) : null;

    return {
      project_id: projectId,
      title: task.title,
      phase: task.phase,
      due_date,
      position,
    };
  });

  const { error } = await supabase.from("tasks").insert(rows);

  if (error) throw error;

  revalidatePath(checklistPath(projectId));
}
