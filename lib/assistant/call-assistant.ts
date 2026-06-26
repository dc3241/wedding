import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import type { AccountKind } from "@/lib/account-context";
import {
  executeReadTool,
  READ_TOOL_DEFINITIONS,
} from "@/lib/assistant/read-tools";
import {
  executeWriteTool,
  isWriteTool,
  WRITE_TOOL_DEFINITIONS,
} from "@/lib/assistant/write-tools";
import type { SupabaseClient } from "@supabase/supabase-js";

const ASSISTANT_TOOL_DEFINITIONS = [
  ...READ_TOOL_DEFINITIONS,
  ...WRITE_TOOL_DEFINITIONS,
];

const MAX_TOOL_ITERATIONS = 8;

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};
type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
};

type AssistantContext = {
  projectName: string;
  weddingDate: string | null;
  accountKind: AccountKind;
};

function buildSystemPrompt(ctx: AssistantContext): string {
  const audience =
    ctx.accountKind === "business"
      ? "You are helping a professional wedding planner manage this client's wedding."
      : "You are helping a couple plan their wedding.";

  const tone =
    ctx.accountKind === "business"
      ? "Be efficient and professional — use concise sentences when listing multiple items."
      : "Be warm and personal — supportive, never overwhelming.";

  const dateLine = ctx.weddingDate
    ? `Wedding date: ${ctx.weddingDate}.`
    : "Wedding date is not set yet.";

  return `${audience} Project: "${ctx.projectName}". ${dateLine}

${tone} Write in plain conversational prose — no markdown headers, no hashtags, and no emojis.

You can answer questions using read tools and take actions using write tools when the user clearly asks. Available actions: add a checklist task, update a task's status, add a guest, update a guest's RSVP, set the budget target, add a budget line item, add a vendor category to book, add a note, and add a day-of timeline event (the wedding-day run sheet — not the long-range checklist). Only call a write tool when the user clearly requests that specific action — otherwise suggest what they could do but do not act. After taking an action, confirm in plain prose exactly what you did. If asked to delete anything, send emails to vendors, or make bulk changes, explain that you cannot do that and point them to the right tab (Checklist, Day-of timeline, Guests, Budget, Vendors, or Notes).

Use read tools to look up live project data — never guess counts, names, amounts, or IDs. When updating a task or guest, use get_checklist or get_guests first if you need an ID. Keep answers brief (a short paragraph or a few simple sentences). If data is empty, say so kindly and suggest what they could add in the app.`;
}

function extractText(blocks: AnthropicContentBlock[]): string {
  return blocks
    .filter((block): block is AnthropicTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

async function callClaude(
  system: string,
  messages: ClaudeMessage[],
): Promise<
  | { ok: true; content: AnthropicContentBlock[] }
  | { ok: false; error: string }
> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "The assistant is not configured yet. Please try again later.",
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system,
        tools: ASSISTANT_TOOL_DEFINITIONS,
        messages,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error:
          "The assistant had trouble responding. Please try again in a moment.",
      };
    }

    const data = (await response.json()) as {
      content?: AnthropicContentBlock[];
    };

    if (!data.content?.length) {
      return {
        ok: false,
        error: "The assistant returned an empty response. Please try again.",
      };
    }

    return { ok: true, content: data.content };
  } catch {
    return {
      ok: false,
      error:
        "Something went wrong reaching the assistant. Please try again shortly.",
    };
  }
}

export async function runAssistantWithTools(
  supabase: SupabaseClient,
  projectId: string,
  history: { role: "user" | "assistant"; content: string }[],
  userText: string,
  context: AssistantContext,
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const system = buildSystemPrompt(context);
  const messages: ClaudeMessage[] = [
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user" as const, content: userText },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await callClaude(system, messages);
    if (!result.ok) return result;

    const toolUses = result.content.filter(
      (block): block is AnthropicToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      const reply = extractText(result.content);
      if (!reply) {
        return {
          ok: false,
          error: "The assistant returned an empty response. Please try again.",
        };
      }
      return { ok: true, reply };
    }

    messages.push({ role: "assistant", content: result.content });

    const toolResults: AnthropicToolResultBlock[] = [];
    for (const toolUse of toolUses) {
      try {
        const data = isWriteTool(toolUse.name)
          ? await executeWriteTool(projectId, toolUse.name, toolUse.input)
          : await executeReadTool(supabase, projectId, toolUse.name);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(data),
        });
      } catch {
        const verb = isWriteTool(toolUse.name) ? "complete" : "load data for";
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            success: false,
            error: `Failed to ${verb} ${toolUse.name}`,
          }),
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    ok: false,
    error:
      "The assistant needed too many lookups for that question. Try asking something more specific.",
  };
}
