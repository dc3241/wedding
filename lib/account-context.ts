import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountKind = "personal" | "business";

export type AccountContext = {
  kind: AccountKind;
  projectIds: string[];
  singleProjectId: string | null;
};

export async function getAccountContext(
  supabase: SupabaseClient,
): Promise<AccountContext | null> {
  const { data: memberships } = await supabase
    .from("account_members")
    .select("account_id")
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
    .order("created_at", { ascending: true });

  const projectIds = (projects ?? []).map((p) => p.id);
  const kind = (account?.kind ?? "personal") as AccountKind;

  return {
    kind,
    projectIds,
    singleProjectId: projectIds.length === 1 ? projectIds[0] : null,
  };
}
