/**
 * Admin image generator — prompt packet only.
 *
 * Same concealment posture as /api/admin/automations/run: 404 for
 * non-admins. Structured json_schema via callClaudeJson (ONB-07 pattern).
 * Never calls KIE or any image-generation host.
 */
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PACKET_FIELDS = [
  "concept",
  "styleReference",
  "composition",
  "colorsAndLighting",
  "aspectRatio",
  "negativePrompt",
] as const;

const PACKET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...PACKET_FIELDS],
  properties: {
    concept: { type: "string", description: "One-line restatement of the graphic." },
    styleReference: { type: "string", description: "How it should look, tied to the chosen style." },
    composition: { type: "string", description: "Framing, hierarchy, what's in frame." },
    colorsAndLighting: { type: "string", description: "Palette and light. Soft stack: mauve canvas, berry accent, no gold." },
    aspectRatio: { type: "string", description: "e.g. 4:5, 9:16, 1:1 depending on use." },
    negativePrompt: { type: "string", description: "What to avoid." },
  },
};

function asPacket(
  value: unknown,
): Record<(typeof PACKET_FIELDS)[number], string> | null {
  if (!isRecord(value)) return null;
  const out: Record<string, string> = {};
  for (const key of PACKET_FIELDS) {
    const v = value[key];
    if (typeof v !== "string" || !v.trim()) return null;
    out[key] = v.trim();
  }
  return out as Record<(typeof PACKET_FIELDS)[number], string>;
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

  let body: { concept?: string; style?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const concept = body.concept?.trim() ?? "";
  const style = body.style?.trim() ?? "";
  if (!concept) {
    return NextResponse.json({ error: "concept is required" }, { status: 400 });
  }
  if (!style) {
    return NextResponse.json({ error: "style is required" }, { status: 400 });
  }

  const parsed = await callClaudeJson({
    system: `You write KIE / Seedream 5 Pro image-to-image prompt packets for First Look, a wedding-planning app.
Return only the six fields in the schema. Never use the word "AI" — say "automatically" if relevant.
Keep the packet tight enough to paste directly into KIE. No gold, florals, or photographic ornament.`,
    user: `Concept: "${concept}". Style: ${style}.`,
    maxTokens: 800,
    jsonSchema: PACKET_SCHEMA,
  });

  const packet = asPacket(parsed);
  if (!packet) {
    return NextResponse.json(
      { error: "The model did not return a complete prompt packet." },
      { status: 502 },
    );
  }

  return NextResponse.json(packet);
}
