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

export type AssistantSideEffects = {
  timelineEventsAdded: number;
  latestTimelineStartTime: string | null;
};

export type AssistantRunResult =
  | { ok: true; reply: string; status: "completed" }
  | {
      ok: true;
      reply: string;
      status: "cap_hit_with_side_effects";
      sideEffects: AssistantSideEffects;
    }
  | { ok: false; error: string; status: "cap_hit" | "error" };

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

type CachedSystemBlock = {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
};

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AssistantContext = {
  projectName: string;
  weddingDate: string | null;
  accountKind: AccountKind;
};

function buildSystemPrompt(ctx: AssistantContext): string {
  const audience =
    ctx.accountKind === "business"
      ? "You are helping a professional wedding planner manage this client's wedding inside First Look."
      : "You are helping a couple plan their wedding inside First Look.";

  const tone =
    ctx.accountKind === "business"
      ? "Be efficient and professional — use concise sentences when listing multiple items."
      : "Be warm and personal — supportive, never overwhelming.";

  const dateLine = ctx.weddingDate
    ? `Wedding date: ${ctx.weddingDate}.`
    : "Wedding date is not set yet.";

  return `${audience} Project: "${ctx.projectName}". ${dateLine}

${tone} Write in plain conversational prose — no markdown headers, no hashtags, and no emojis.

First Look is the wedding-planning platform the user is already using. Never refer them to competitor products or external wedding platforms (for example Zola, The Knot, Aisle Planner, or any "wherever you're building your site"). Do not suggest they leave First Look to finish a task elsewhere.

The couple's wedding website is built in First Look on the Website tab. That tab includes at least a Wedding Details section and a Schedule section that feed the public site. Use get_website to check website state. Use set_website_schedule only to FILL an EMPTY Schedule (typically after get_timeline) with guest-facing items — it never overwrites existing schedule items. If the Schedule already has items, or there is no website yet, say so plainly and point them to the Website tab. The Schedule is GUEST-FACING: when mapping from the day-of timeline, curate — omit internal/vendor-only run-sheet items (load-in, vendor arrivals, setup) and do not surface owner or vendor names; titles and descriptions should read for guests.

You can answer questions using read tools and take actions using write tools when the user clearly asks. Available actions: add a checklist task, update a task's status, add a guest, update a guest's RSVP, set the budget target, add a budget line item, add a vendor category to book, add a note, add a single day-of timeline event, add multiple day-of timeline events in one batch (the wedding-day run sheet — not the long-range checklist), and fill an empty wedding-website Schedule from curated timeline items (set_website_schedule). Only call a write tool when the user clearly requests that specific action — otherwise suggest what they could do but do not act. After taking an action, confirm in plain prose exactly what you did.

When adding multiple timeline events (for example, generating a full day-of run sheet), gather the needed details first, then call add_timeline_events once with the full list. Use add_timeline_event only for a genuine single event — do not add events one at a time.

If asked to delete anything, send emails to vendors, overwrite or broadly edit the wedding website, or make bulk delete/update changes, explain that you cannot do that and point them to the right in-app tab (Checklist, Day-of timeline, Guests, Budget, Vendors, Website, or Notes). When you lack a tool for an in-app capability, stay honest that you cannot do it for them right now, and direct them to the correct place inside First Look — never to an external product.

Use read tools to look up live project data — never guess counts, names, amounts, or IDs. Read tools return a summary plus a capped set of the most relevant rows with total and truncated fields; when truncated is true, state the totals honestly and ask the user to narrow rather than implying you saw the whole list; use get_note(id) to read a specific note's full text. You can read the day-of run sheet via get_timeline — call it before continuing a timeline, summarizing what's scheduled, deciding whether events already exist, or curating items for set_website_schedule. When updating a task or guest, use get_checklist or get_guests first if you need an ID. If you have no tool for a type of data, say so plainly — do not infer that data is absent because a different read tool returned empty results. Keep answers brief (a short paragraph or a few simple sentences). If data is empty, say so kindly and suggest what they could add in the app.`;
}

function extractText(blocks: AnthropicContentBlock[]): string {
  return blocks
    .filter((block): block is AnthropicTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

function emptySideEffects(): AssistantSideEffects {
  return { timelineEventsAdded: 0, latestTimelineStartTime: null };
}

function isLaterTime(candidate: string, current: string | null): boolean {
  if (!current) return true;
  const normalize = (value: string) =>
    value.length === 5 ? `${value}:00` : value;
  return normalize(candidate) > normalize(current);
}

function trackWriteToolSideEffects(
  effects: AssistantSideEffects,
  data: unknown,
): void {
  if (typeof data !== "object" || data === null) return;
  const result = data as Record<string, unknown>;
  if (result.success !== true) return;

  if (result.action === "add_timeline_event") {
    effects.timelineEventsAdded += 1;
    const startTime =
      typeof result.start_time === "string" ? result.start_time : null;
    if (startTime && isLaterTime(startTime, effects.latestTimelineStartTime)) {
      effects.latestTimelineStartTime = startTime;
    }
    return;
  }

  if (result.action === "add_timeline_events") {
    const count = typeof result.count === "number" ? result.count : 0;
    effects.timelineEventsAdded += count;
    const latest =
      typeof result.latest_start_time === "string"
        ? result.latest_start_time
        : null;
    if (latest && isLaterTime(latest, effects.latestTimelineStartTime)) {
      effects.latestTimelineStartTime = latest;
    }
  }
}

function formatTime12h(time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time;
  const [hourPart, minutePart] = normalized.split(":");
  const hour24 = Number.parseInt(hourPart, 10);
  const minutes = minutePart.slice(0, 2);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

function buildCapHitReplyWithSideEffects(effects: AssistantSideEffects): string {
  const eventLabel =
    effects.timelineEventsAdded === 1 ? "event" : "events";
  let reply = `Added ${effects.timelineEventsAdded} ${eventLabel} to the day-of timeline`;
  if (effects.latestTimelineStartTime) {
    reply += `, through ${formatTime12h(effects.latestTimelineStartTime)}`;
  }
  reply +=
    ". That was more than I could finish in one pass — want me to continue?";
  return reply;
}

function hasCommittedSideEffects(effects: AssistantSideEffects): boolean {
  return effects.timelineEventsAdded > 0;
}

function buildCachedSystem(systemText: string): CachedSystemBlock[] {
  return [
    {
      type: "text",
      text: systemText,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function logAssistantUsage(usage: AnthropicUsage | undefined, messageCount: number) {
  if (!usage) {
    console.info("[assistant.usage]", { messages: messageCount });
    return;
  }
  console.info("[assistant.usage]", {
    messages: messageCount,
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
  });
}

async function callClaude(
  systemText: string,
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
        system: buildCachedSystem(systemText),
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
      usage?: AnthropicUsage;
    };

    logAssistantUsage(data.usage, messages.length);

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
): Promise<AssistantRunResult> {
  const system = buildSystemPrompt(context);
  const messages: ClaudeMessage[] = [
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user" as const, content: userText },
  ];
  const sideEffects = emptySideEffects();

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const result = await callClaude(system, messages);
    if (!result.ok) return { ...result, status: "error" };

    const toolUses = result.content.filter(
      (block): block is AnthropicToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      const reply = extractText(result.content);
      if (!reply) {
        return {
          ok: false,
          status: "error",
          error: "The assistant returned an empty response. Please try again.",
        };
      }
      return { ok: true, reply, status: "completed" };
    }

    messages.push({ role: "assistant", content: result.content });

    const toolResults: AnthropicToolResultBlock[] = [];
    for (const toolUse of toolUses) {
      try {
        const data = isWriteTool(toolUse.name)
          ? await executeWriteTool(projectId, toolUse.name, toolUse.input)
          : await executeReadTool(
              supabase,
              projectId,
              toolUse.name,
              toolUse.input,
            );
        if (isWriteTool(toolUse.name)) {
          trackWriteToolSideEffects(sideEffects, data);
        }
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

  if (hasCommittedSideEffects(sideEffects)) {
    return {
      ok: true,
      status: "cap_hit_with_side_effects",
      sideEffects,
      reply: buildCapHitReplyWithSideEffects(sideEffects),
    };
  }

  return {
    ok: false,
    status: "cap_hit",
    error:
      "The assistant needed too many lookups for that question. Try asking something more specific.",
  };
}
