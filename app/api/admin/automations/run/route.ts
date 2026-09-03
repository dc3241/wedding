/**
 * Admin automations — manual-trigger content generation.
 *
 * Server-side only: the Anthropic key never reaches the browser (unlike
 * the reference mockup, which called the API directly from the client).
 * Same fetch shape as lib/assistant/call-assistant.ts / lib/inquiry/llm-json.ts
 * (raw fetch, no @anthropic-ai/sdk dependency), MODEL_API_KEY, ANTHROPIC_MODEL.
 *
 * Cron-scheduled runs are a fast-follow, not required for this build —
 * this route is invoked only by the "Run" button on /admin/automations.
 */
import { NextResponse } from "next/server";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function callClaudeText(system: string, user: string): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "MODEL_API_KEY is not configured." };
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
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Anthropic API error (${response.status}): ${detail.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) {
      return { ok: false, error: "The model returned an empty response." };
    }
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request to Anthropic failed.",
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { promptId?: string; inputText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const promptId = body.promptId;
  if (!promptId) {
    return NextResponse.json({ error: "promptId is required" }, { status: 400 });
  }
  const inputText = body.inputText?.trim() || null;

  const { data: prompt, error: promptError } = await supabase
    .from("admin_automation_prompts")
    .select("id, name, prompt_template")
    .eq("id", promptId)
    .single();

  if (promptError || !prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  const { data: run, error: runError } = await supabase
    .from("admin_automation_runs")
    .insert({
      prompt_id: prompt.id,
      triggered_by: user.id,
      input_text: inputText,
      status: "running",
    })
    .select("id")
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Could not start run" }, { status: 500 });
  }

  const result = await callClaudeText(
    prompt.prompt_template,
    inputText ?? "Generate content following the instructions above.",
  );

  if (!result.ok) {
    await supabase
      .from("admin_automation_runs")
      .update({
        status: "error",
        error_message: result.error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return NextResponse.json({ error: result.error, runId: run.id }, { status: 502 });
  }

  await supabase
    .from("admin_automation_runs")
    .update({
      status: "completed",
      output_text: result.text,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return NextResponse.json({ runId: run.id, output: result.text });
}
