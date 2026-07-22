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

/**
 * Projects the user belongs to DIRECTLY via project_members, independent of any
 * account. For invited couples this is their only access path; they have no
 * accounts row and no account_members row. Ordered by created_at for stability.
 */
export async function getDirectProjectIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => row.project_id);
  } catch {
    return [];
  }
}
