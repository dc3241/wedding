import "server-only";

import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

const DETAIL_MAX = 400;

export function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= DETAIL_MAX) return trimmed;
  return `${trimmed.slice(0, DETAIL_MAX)}…`;
}

function anthropicErrorDetail(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: unknown; type?: unknown };
      message?: unknown;
    };
    const nested =
      typeof parsed.error?.message === "string" ? parsed.error.message : null;
    const top = typeof parsed.message === "string" ? parsed.message : null;
    const type =
      typeof parsed.error?.type === "string" ? parsed.error.type : null;
    const message = nested ?? top;
    if (message && type) return `${type}: ${message}`;
    if (message) return message;
  } catch {
    /* fall through */
  }
  return raw.trim() || "(empty body)";
}

function fail(message: string): never {
  console.error("callClaudeJson:", message);
  throw new Error(message);
}

export async function callClaudeJson(args: {
  system: string;
  user: string;
  maxTokens?: number;
  /** ONB-07 structured output. When set, the request uses
   * output_config.format.type = json_schema instead of fenced-JSON parsing. */
  jsonSchema?: Record<string, unknown>;
}): Promise<unknown> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    fail("MODEL_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: args.maxTokens ?? 1024,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  };
  if (args.jsonSchema) {
    body.output_config = {
      format: {
        type: "json_schema",
        schema: args.jsonSchema,
      },
    };
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network error";
    fail(`Anthropic request failed: ${clip(detail)}`);
  }

  const rawEnvelope = await response.text();
  if (!response.ok) {
    fail(`Anthropic ${response.status}: ${clip(anthropicErrorDetail(rawEnvelope))}`);
  }

  let envelope: {
    content?: { type?: string; text?: string }[];
    stop_reason?: string;
  };
  try {
    envelope = JSON.parse(rawEnvelope) as typeof envelope;
  } catch {
    fail(`Anthropic returned a non-JSON envelope: ${clip(rawEnvelope)}`);
  }

  const raw = envelope.content?.find((block) => block.type === "text")?.text;
  if (!raw) {
    const types =
      envelope.content?.map((block) => block.type ?? "unknown").join(", ") ||
      "none";
    const stop = envelope.stop_reason ? `; stop_reason: ${envelope.stop_reason}` : "";
    fail(`Anthropic returned no text block (content types: ${types}${stop}).`);
  }

  try {
    return JSON.parse(stripJsonFences(raw)) as unknown;
  } catch (err) {
    const where = err instanceof SyntaxError ? ` (${err.message})` : "";
    fail(`Anthropic JSON parse failed${where}: ${clip(stripJsonFences(raw))}`);
  }
}
