/**
 * Admin ideation — "Generate ideas" action. Same server-side-only
 * Anthropic call pattern as the automations route (MODEL_API_KEY never
 * reaches the browser), different prompt: short candidate content ideas
 * rather than a full script/post.
 *
 * Preference-tuned prompting, NOT model fine-tuning: before generating,
 * pull the best-rated (up, with comments) and worst-rated (down, with
 * comments) prior ideas as few-shot context so the model learns what
 * Dom/Jordyn actually like without any training infrastructure.
 */
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a social content strategist for First Look, a wedding-planning SaaS
for couples and wedding planners/venues. You are brainstorming short-form
content ideas (TikTok, Instagram, Facebook, Pinterest, LinkedIn) for the
founders to post from their own personal-feeling brand account.

Tone: warm, useful, a little funny, never salesy. Mix of pure-value tips,
behind-the-scenes/story content, and soft product mentions — mostly NOT
direct promo. Ideas should be one or two sentences each: a hook or topic a
human could turn into a script without more research.

Return ONLY strict JSON: {"ideas": ["idea one", "idea two", ...]}. No
markdown fences, no commentary.`;

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

  let body: { topic?: string; count?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const topic = body.topic?.trim() || null;
  const count = Math.min(Math.max(body.count ?? 8, 1), 20);

  const [{ data: liked }, { data: disliked }] = await Promise.all([
    supabase
      .from("ideation_items")
      .select("idea_text, comment")
      .eq("rating", "up")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("ideation_items")
      .select("idea_text, comment")
      .eq("rating", "down")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const fewShotLines: string[] = [];
  if (liked?.length) {
    fewShotLines.push("Ideas the team has liked before (lean into these patterns):");
    for (const row of liked) {
      fewShotLines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }
  if (disliked?.length) {
    fewShotLines.push("Ideas the team has disliked before (avoid these patterns):");
    for (const row of disliked) {
      fewShotLines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }

  const userText = [
    `Generate ${count} new content ideas.`,
    topic ? `Focus area / topic: ${topic}` : "No specific topic — free brainstorm.",
    fewShotLines.length ? "\n" + fewShotLines.join("\n") : "",
    "\nDo not repeat any of the ideas listed above verbatim.",
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user: userText,
    maxTokens: 1536,
  });

  if (!isRecord(parsed)) {
    return NextResponse.json({ error: "The model returned an unexpected response." }, { status: 502 });
  }
  const rawIdeas = parsed.ideas;
  if (!Array.isArray(rawIdeas)) {
    return NextResponse.json({ error: "The model returned an unexpected response." }, { status: 502 });
  }

  const ideas = rawIdeas.filter((i): i is string => typeof i === "string" && i.trim().length > 0);
  if (ideas.length === 0) {
    return NextResponse.json({ error: "No ideas were generated." }, { status: 502 });
  }

  const { data: inserted, error } = await supabase
    .from("ideation_items")
    .insert(ideas.map((idea_text) => ({ idea_text, requested_by: user.id })))
    .select("id, idea_text, requested_by, rating, comment, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: inserted ?? [] });
}
