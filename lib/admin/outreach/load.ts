import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isOutreachAudience,
  isOutreachChannel,
  OUTREACH_AUDIENCES,
  OUTREACH_PER_AUDIENCE,
  type OutreachTarget,
} from "@/lib/admin/outreach";

function mapRow(row: {
  id: string;
  outreach_date: string;
  audience: string;
  position: number;
  channel: string;
  name: string;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
}): OutreachTarget | null {
  if (!isOutreachAudience(row.audience) || !isOutreachChannel(row.channel)) return null;
  return {
    id: row.id,
    outreach_date: row.outreach_date,
    audience: row.audience,
    position: row.position,
    channel: row.channel,
    name: row.name,
    subject: row.subject,
    body: row.body,
    sent_at: row.sent_at,
  };
}

export async function ensureOutreachDay(
  supabase: SupabaseClient,
  outreachDate: string,
): Promise<OutreachTarget[]> {
  const seeds = OUTREACH_AUDIENCES.flatMap((audience) =>
    Array.from({ length: OUTREACH_PER_AUDIENCE }, (_, index) => ({
      outreach_date: outreachDate,
      audience,
      position: index + 1,
    })),
  );

  const { error: insertError } = await supabase.from("outreach_targets").upsert(seeds, {
    onConflict: "outreach_date,audience,position",
    ignoreDuplicates: true,
  });
  if (insertError) throw new Error(insertError.message);

  const { data, error } = await supabase
    .from("outreach_targets")
    .select("id, outreach_date, audience, position, channel, name, subject, body, sent_at")
    .eq("outreach_date", outreachDate)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => mapRow(row))
    .filter((row): row is OutreachTarget => row !== null)
    .sort((a, b) => a.audience.localeCompare(b.audience) || a.position - b.position);
}
