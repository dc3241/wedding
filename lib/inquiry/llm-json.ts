import "server-only";

import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function callClaudeJson(args: {
  system: string;
  user: string;
  maxTokens?: number;
  /** ONB-07 structured output. When set, the request uses
   * output_config.format.type = json_schema instead of fenced-JSON parsing. */
  jsonSchema?: Record<string, unknown>;
}): Promise<unknown | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  try {
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const raw = data.content?.find((block) => block.type === "text")?.text;
    if (!raw) return null;

    return JSON.parse(stripJsonFences(raw)) as unknown;
  } catch {
    return null;
  }
}
