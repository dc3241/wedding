"use server";

import { revalidatePath } from "next/cache";
import type { ProjectAssignee } from "@/components/checklist/assignee-utils";
import { friendlyLeadError } from "@/components/leads/friendly-lead-error";
import { clampDueDateToToday } from "@/lib/date-months";
import { clientForWrite } from "@/utils/supabase/for-write";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dueDateFromWedding,
  STARTER_TASKS,
} from "./starter-tasks";

export type { ProjectAssignee };

export type AssignTaskResult =
  | { ok: true }
  | { ok: false; error: string };

function checklistPath(projectId: string) {
  return `/projects/${projectId}/checklist`;
}

function revalidateChecklist(projectId: string) {
  revalidatePath(checklistPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/calendar`);
  revalidatePath("/calendar");
}

async function maxPosition(
  projectId: string,
  phase: string | null,
  client?: SupabaseClient,
) {
  const supabase = await clientForWrite(client);

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
  client?: SupabaseClient,
) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await clientForWrite(client);

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: trimmed,
    phase,
    due_date: dueDate ?? null,
    position: await maxPosition(projectId, phase, client),
  });

  if (error) throw error;

  revalidateChecklist(projectId);
}

export async function toggleTask(
  taskId: string,
  nextStatus: string,
  client?: SupabaseClient,
) {
  const supabase = await clientForWrite(client);

  // assigned_to is not writable here — assignTask is the only path.
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateChecklist(data.project_id);
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateChecklist(data.project_id);
}

export async function updateTaskTitle(taskId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  const supabase = await createClient();

  // assigned_to is not writable here — assignTask is the only path.
  const { data, error } = await supabase
    .from("tasks")
    .update({ title: trimmed })
    .eq("id", taskId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateChecklist(data.project_id);
}

export async function getProjectAssignees(
  projectId: string,
): Promise<ProjectAssignee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_project_assignees", {
    p_project_id: projectId,
  });

  if (error) throw error;

  return (data ?? []).map(
    (row: { user_id: string; email: string | null; role_label: string }) => ({
      userId: row.user_id,
      email: row.email ?? "",
      roleLabel: row.role_label,
    }),
  );
}

export async function assignTask(
  taskId: string,
  projectId: string,
  userId: string | null,
): Promise<AssignTaskResult> {
  try {
    const supabase = await createClient();

    if (userId !== null) {
      const assignees = await getProjectAssignees(projectId);
      if (!assignees.some((person) => person.userId === userId)) {
        return {
          ok: false,
          error: "That person isn't on this project.",
        };
      }
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ assigned_to: userId })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false, error: friendlyLeadError(error.message) };
    }
    if (!data) {
      return { ok: false, error: "Task not found." };
    }

    revalidateChecklist(projectId);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't update assignment.";
    return { ok: false, error: friendlyLeadError(message) };
  }
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

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const rows = STARTER_TASKS.map((task) => {
    const position = phasePositions.get(task.phase) ?? 0;
    phasePositions.set(task.phase, position + 1);

    const due_date = clampDueDateToToday(
      weddingDate !== null ? dueDateFromWedding(weddingDate, task) : null,
      todayIso,
    );

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

  revalidateChecklist(projectId);
}
