import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export type OutreachBrief = {
  date: string;
  venueArea: string;
  budgetVibe: string;
  askingFor: string;
};

type VendorContext = {
  name: string;
  category: string | null;
  aiOverview: string | null;
};

type WeddingContext = {
  projectName: string;
  weddingDate: string | null;
};

type DraftContent = {
  subject: string;
  body: string;
};

export async function generateOutreachDraft(
  vendor: VendorContext,
  wedding: WeddingContext,
  brief: OutreachBrief
): Promise<DraftContent | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are helping a couple write a first outreach email to a wedding vendor. Write a warm, professional email that feels personal—not a form letter.

Use the couple's wedding details and brief below. Address the email to this specific vendor by name and reference their category where natural.

Vendor:
- Name: ${vendor.name}
- Category: ${vendor.category ?? "vendor"}
${vendor.aiOverview ? `- About them (from their website): ${vendor.aiOverview}` : ""}

Wedding:
- Project: ${wedding.projectName}
${wedding.weddingDate ? `- Wedding date on file: ${wedding.weddingDate}` : ""}

Couple's brief:
- Date / timing: ${brief.date || "not specified"}
- Venue / area: ${brief.venueArea || "not specified"}
- Budget vibe: ${brief.budgetVibe || "not specified"}
- What they're asking for: ${brief.askingFor || "general availability and pricing"}

Write one email with a clear subject line and body. Keep the body concise (about 120–200 words). Do not invent vendor contact details. Sign off warmly as the couple (use the project name if no couple names are given).

Respond with JSON only, no markdown:
{"subject":"...","body":"..."}`;

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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const raw = data.content?.find((block) => block.type === "text")?.text;
    if (!raw) return null;

    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText) as DraftContent;
    const subject = parsed.subject?.trim();
    const body = parsed.body?.trim();

    if (!subject || !body) return null;

    return { subject, body };
  } catch {
    return null;
  }
}
