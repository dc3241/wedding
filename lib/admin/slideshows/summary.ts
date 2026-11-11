import "server-only";

import { adminToday } from "@/lib/admin/today";
import { callClaudeJson } from "@/lib/inquiry/llm-json";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { groupStats, mondayOnOrBefore, describePerformance } from "./logic";
import { loadScoredPosts } from "./run";

const SYSTEM = `You write the weekly slideshow readout for Dom, the founder of First Look (a wedding-planning app for couples). You are talking to him, not writing a report.

Voice: conversational, plain, direct. First person ("I"). Short paragraphs, no headings, no bullet lists, no emoji.
Cover, in this order: what is working (name the angles and post types), what is not working, posts still waiting on results, and what you plan to lean toward in the next batch. End with one specific question he can answer to steer you.
Rules:
- Use ONLY the numbers in the data you are given. Never invent a stat, view count, or reason you cannot see in the data.
- If there is little or no data, say so plainly, and say what you would test next.
- Never use the word "AI". Say "the assistant" or "automatically".
- Under 220 words.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["body"],
  properties: { body: { type: "string" } },
};

export async function generateWeeklySummary(): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceRoleClient();
  const today = adminToday();
  const weekStart = mondayOnOrBefore(today);
  const scored = await loadScoredPosts(supabase);

  const { data: waiting } = await supabase
    .from("slideshow_posts")
    .select("title, kind, angle_key, downloaded_at, slideshow_results(views)")
    .eq("status", "selected")
    .order("downloaded_at", { ascending: false })
    .limit(40);
  const needResults = (waiting ?? []).filter((p) => {
    const r = Array.isArray(p.slideshow_results) ? p.slideshow_results[0] : p.slideshow_results;
    return !r || !r.views;
  });

  const [{ data: directions }, { data: previous }] = await Promise.all([
    supabase.from("slideshow_direction").select("body").eq("active", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("slideshow_summaries").select("body").order("week_start", { ascending: false }).limit(1),
  ]);

  const kinds = groupStats(scored, (p) => p.kind);
  const user = [
    `Scored posts (results logged, views > 0): ${scored.length}`,
    scored.length ? `Performance by group:\n${describePerformance(scored)}` : "No scored posts yet.",
    `By post type: ${kinds.map((k) => `${k.key} avg score ${k.avgScore.toFixed(1)} over ${k.n} posts, ${k.views} views`).join("; ") || "none"}`,
    `Posts downloaded but still missing results (${needResults.length}): ${needResults
      .slice(0, 8)
      .map((p) => `"${p.title}" (${p.kind}, ${p.angle_key})`)
      .join("; ") || "none"}`,
    `Standing direction from Dom: ${(directions ?? []).map((d) => d.body).join(" | ") || "none"}`,
    `Last week's readout (do not repeat it): ${previous?.[0]?.body?.slice(0, 600) ?? "none"}`,
  ].join("\n\n");

  const out = (await callClaudeJson({ system: SYSTEM, user, maxTokens: 900, jsonSchema: SCHEMA })) as { body?: string };
  const body = String(out?.body ?? "").trim();
  if (!body) return { error: "Empty summary." };

  const { data, error } = await supabase
    .from("slideshow_summaries")
    .upsert(
      { week_start: weekStart, body, stats: { scored: scored.length, waiting: needResults.length } },
      { onConflict: "week_start" },
    )
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save summary." };
  await supabase.from("slideshow_settings").update({ last_summary_on: today, updated_at: new Date().toISOString() }).eq("id", 1);
  return { id: String(data.id) };
}
