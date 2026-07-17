import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountKind = "personal" | "business";

export type AccountContext = {
  kind: AccountKind;
  projectIds: string[];
  singleProjectId: string | null;
  firstProjectId: string | null;
};

export async function getAccountContext(
  supabase: SupabaseClient,
): Promise<AccountContext | null> {
  const { data: memberships } = await supabase
    .from("account_members")
    .select("account_id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!memberships?.length) {
    return null;
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("kind")
    .eq("id", memberships[0].account_id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("account_id", memberships[0].account_id)
    .order("created_at", { ascending: true });

  const projectIds = (projects ?? []).map((p) => p.id);
  const kind = (account?.kind ?? "personal") as AccountKind;

  return {
    kind,
    projectIds,
    singleProjectId: projectIds.length === 1 ? projectIds[0] : null,
    firstProjectId: projectIds[0] ?? null,
  };
}
