import {
  isDateOnlyProjectName,
  syncProjectNameWithWeddingDate,
} from "@/lib/wedding-date";
import { parseWeddingWebsiteContent } from "@/components/website/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadWeddingDateSyncContext(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, wedding_date, account_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("name, kind")
    .eq("id", project.account_id)
    .maybeSingle();

  return {
    name: project.name as string,
    weddingDate: (project.wedding_date as string | null) ?? null,
    accountName: (account?.name as string | null) ?? null,
    preferAccountName: account?.kind === "personal",
  };
}

export async function patchWebsiteHeroForWeddingDateChange(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    previousName: string;
    previousDate: string | null;
    nextName: string;
    nextDate: string | null;
  },
): Promise<void> {
  const { data: website } = await supabase
    .from("wedding_websites")
    .select("content")
    .eq("project_id", args.projectId)
    .maybeSingle();

  if (!website) return;

  const content = parseWeddingWebsiteContent(website.content);
  let changed = false;

  const heroDate = content.hero.date.trim();
  if (!heroDate || heroDate === (args.previousDate ?? "")) {
    const next = args.nextDate ?? "";
    if (content.hero.date !== next) {
      content.hero.date = next;
      changed = true;
    }
  }

  const heroNames = content.hero.names.trim();
  if (
    heroNames === args.previousName.trim() ||
    isDateOnlyProjectName(heroNames)
  ) {
    if (content.hero.names !== args.nextName) {
      content.hero.names = args.nextName;
      changed = true;
    }
  }

  if (!changed) return;

  await supabase
    .from("wedding_websites")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", args.projectId);
}

export function nextProjectNameForWeddingDate(args: {
  currentName: string;
  previousDate: string | null;
  nextDate: string | null;
  accountName: string | null;
  preferAccountName?: boolean;
}): string {
  return syncProjectNameWithWeddingDate(args);
}
