"use server";

import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import { getAccountContext } from "@/lib/account-context";
import { ASSISTANT_HISTORY_WINDOW } from "@/components/assistant/constants";
import type {
  AssistantMessage,
  SendAssistantResult,
} from "@/components/assistant/types";
import { createClient } from "@/utils/supabase/server";

export async function loadAssistantMessages(
  projectId: string,
): Promise<AssistantMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as AssistantMessage[];
}

export async function sendAssistantMessage(
  projectId: string,
  userText: string,
): Promise<SendAssistantResult> {
  const trimmed = userText.trim();
  if (!trimmed) {
    return { success: false, error: "Please enter a message." };
  }

  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const accountKind = account?.kind ?? "personal";

  const [{ data: project }, { data: history }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, wedding_date")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("assistant_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(ASSISTANT_HISTORY_WINDOW),
  ]);

  if (!project) {
    return { success: false, error: "Project not found." };
  }

  const conversation = [...(history ?? [])].reverse().map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
  }));

  const result = await runAssistantWithTools(
    supabase,
    projectId,
    conversation,
    trimmed,
    {
      projectName: project.name,
      weddingDate: project.wedding_date,
      accountKind,
    },
  );

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const { error: insertError } = await supabase.from("assistant_messages").insert([
    { project_id: projectId, role: "user", content: trimmed },
    { project_id: projectId, role: "assistant", content: result.reply },
  ]);

  if (insertError) {
    return {
      success: false,
      error: "Your reply was generated but could not be saved. Please try again.",
    };
  }

  return { success: true, reply: result.reply };
}
