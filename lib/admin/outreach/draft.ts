import "server-only";

import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import {
  AUDIENCE_LABEL,
  CHANNEL_LABEL,
  type OutreachAudience,
  type OutreachChannel,
} from "@/lib/admin/outreach";

const SYSTEM_PROMPT = `You write one cold outreach message for Jordyn at First Look.

First Look is a wedding workspace.
- Venues use it as a CRM with team seats and a white-labeled workspace, so couples see the venue's brand. Every wedding and coordinator sits in one book.
- Planners use it for leads, proposals, contracts, seating, billing, and a branded client workspace. It replaces a spreadsheet plus a handful of other tools.

Voice: warm, specific, and short, like a person who runs the product. Never use the word "AI". Do not invent facts about the recipient, their weddings, their posts, or a mutual connection. Use only the name or handle you are given. Do not mention pricing. One message only.

Email: a subject under 50 characters and a body of about 80 to 120 words. Sign off as Jordyn, then First Look on the next line. You may mention usefirstlook.app once. Ask them to reply. Do not invent a calendar link.
TikTok: a DM under 450 characters, two to four sentences. No subject, no email sign-off block, no URL. Still Jordyn from First Look. Conversational, easy to send as a comment or DM.

Return only the JSON shape you are given.`;

function clipText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function draftOutreachMessage(input: {
  audience: OutreachAudience;
  channel: OutreachChannel;
  name: string;
}): Promise<{ subject: string | null; body: string }> {
  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user: `Audience: ${AUDIENCE_LABEL[input.audience]}
Channel: ${CHANNEL_LABEL[input.channel]}
Name or handle: ${input.name}`,
    maxTokens: 800,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
      },
    },
  });

  if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  if (!body) throw new Error("The model returned an empty message.");
  if (input.channel === "tiktok") {
    return { subject: null, body: body.slice(0, 600) };
  }
  const subject = clipText(parsed.subject, 120) || "A note from First Look";
  return { subject, body };
}
