"use server";

import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import { getAccountContext } from "@/lib/account-context";
import { ASSISTANT_HISTORY_WINDOW } from "@/components/assistant/constants";
import type {
  AssistantMessage,
  SendAssistantResult,
} from "@/components/assistant/types";
import {
  ensureChatAccess,
  getProjectAssistantSummary,
  recordAssistantUsage,
} from "@/lib/billing/assistant-access";
import type { AssistantAccessSummary } from "@/lib/billing/assistant-budget";
import { parseEventType, parseHiddenTools } from "@/lib/event-type";
import { createClient } from "@/utils/supabase/server";

/** ASSIST-THREAD-01: same kind === null signal CAL-04 uses for invited members. */
function threadAudienceFromAccount(
  account: Awaited<ReturnType<typeof getAccountContext>>,
): "account" | "invited" {
  return (account?.kind ?? null) === null ? "invited" : "account";
}

export async function loadAssistantMessages(
  projectId: string,
): Promise<AssistantMessage[]> {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const audience = threadAudienceFromAccount(account);

  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, role, content, created_at")
    .eq("project_id", projectId)
    .eq("audience", audience)
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
  const audience = threadAudienceFromAccount(account);

  const [{ data: project }, { data: history }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, wedding_date, event_type, hidden_tools")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("assistant_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .limit(ASSISTANT_HISTORY_WINDOW),
  ]);

  if (!project) {
    return { success: false, error: "Project not found." };
  }

  // COUPLES-PIVOT part 3: the project read above passed RLS, so the viewer
  // can see this wedding. Access is billed to the account that owns it.
  let gate: Awaited<ReturnType<typeof ensureChatAccess>>;
  try {
    gate = await ensureChatAccess(projectId, account?.accountId ?? null);
  } catch (error) {
    console.error("[assistant.access] gate failed", error);
    return {
      success: false,
      error: "The assistant is unavailable right now. Please try again shortly.",
    };
  }

  if (!gate.access.allowed) {
    return {
      success: false,
      error: lockedMessage(gate.summary),
      code: gate.summary.lockReason ?? "upgrade_required",
      access: gate.summary,
    };
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
      eventType: parseEventType(project.event_type),
      hiddenTools: parseHiddenTools(project.hidden_tools),
    },
  );

  await recordAssistantUsage({
    accountId: gate.access.accountId,
    projectId,
    source: "chat",
    usage: result.usage,
  });

  if (!result.ok) {
    return { success: false, error: result.error, access: gate.summary };
  }

  const { error: insertError } = await supabase.from("assistant_messages").insert([
    { project_id: projectId, role: "user", content: trimmed, audience },
    {
      project_id: projectId,
      role: "assistant",
      content: result.reply,
      audience,
    },
  ]);

  if (insertError) {
    return {
      success: false,
      error: "Your reply was generated but could not be saved. Please try again.",
    };
  }

  return { success: true, reply: result.reply, access: gate.summary };
}

function lockedMessage(summary: AssistantAccessSummary): string {
  if (summary.lockReason === "limit_reached") {
    return summary.resetsAt
      ? "You've used this month's assistant allowance. It resets on the 1st."
      : "You've used the assistant allowance on this plan.";
  }
  return summary.canUpgrade
    ? "Your free assistant trial has ended. Upgrade to keep using the assistant."
    : "The assistant isn't included on this wedding's plan right now.";
}

/** Panel status (trial days left, allowance used). Never starts a trial. */
export async function loadAssistantAccess(
  projectId: string,
): Promise<AssistantAccessSummary | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;
  const account = await getAccountContext(supabase);
  return getProjectAssistantSummary(projectId, account?.accountId ?? null);
}
