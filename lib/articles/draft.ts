import "server-only";

import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import { pillarLabel, slugifyTitle, type ArticlePillar } from "@/lib/articles/pillars";
import { PLAN_TOOLS } from "@/lib/plan-tools";

/** MEDIA-05: first-draft article from a topic. A human edits and publishes. */
const SYSTEM = `You write for First Look, a free wedding planning site for couples who are planning their own wedding without a planner.

Voice: warm, plain, practical. Short sentences. Talk to the couple as "you". No filler intros ("Planning a wedding can be overwhelming…"), no exclamation marks, no emoji.

Facts: never invent statistics, survey numbers, quotes or named sources. When you give prices or timelines, use hedged ranges ("often", "many couples") and tell readers to get real quotes locally. Do not mention AI, and do not mention being a language model.

Format the body in this markdown subset ONLY: "## " and "### " headings, "- " bullets, "1. " numbered lists, "> " for one callout tip, **bold**, *italic*, and links written as [label](/path). No tables, no images, no HTML, no H1 (the title is the H1).

Length: 900 to 1,400 words. Open with the answer in the first two sentences. End with a short "## Next steps" section of 3 to 5 bullets.

Where it genuinely helps the reader, link to at most three of these free First Look pages:
${PLAN_TOOLS.map((t) => `- [${t.title}](${t.href}): ${t.body}`).join("\n")}`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "dek", "body"],
  properties: {
    title: { type: "string", description: "Search-friendly headline, at most 70 characters." },
    dek: { type: "string", description: "One-sentence summary under 160 characters, used as the meta description." },
    body: { type: "string", description: "The article body in the allowed markdown subset." },
  },
} as const;

export type ArticleDraft = { title: string; slug: string; dek: string; body: string };

export async function draftArticle(topic: string, pillar: ArticlePillar): Promise<ArticleDraft> {
  const raw = await callClaudeJson({
    system: SYSTEM,
    user: `Topic: ${topic}\nSection of the site: ${pillarLabel(pillar)}\n\nWrite the article.`,
    maxTokens: 6000,
    jsonSchema: SCHEMA as unknown as Record<string, unknown>,
  });
  if (!isRecord(raw)) throw new Error("The draft came back empty. Try again.");
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 160) : "";
  const dek = typeof raw.dek === "string" ? raw.dek.trim().slice(0, 300) : "";
  const body = typeof raw.body === "string" ? raw.body.trim() : "";
  if (!title || !body) throw new Error("The draft was missing a title or body. Try again.");
  return { title, dek, body, slug: slugifyTitle(title) || "article" };
}
