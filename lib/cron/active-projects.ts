import "server-only";

import type { AccountKind } from "@/lib/account-context";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

const PROJECT_PAGE_SIZE = 500;

export type CronAccountEmbed = {
  id: string;
  is_demo: boolean;
  kind: AccountKind;
};

export type CronProjectRow = {
  id: string;
  name: string;
  wedding_date: string | null;
  created_at: string;
  account_id: string;
  accounts: CronAccountEmbed | CronAccountEmbed[] | null;
};

export function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function accountKindFromEmbed(
  kind: string | null | undefined,
): AccountKind {
  return kind === "business" ? "business" : "personal";
}

async function loadActiveNonDemoProjects(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<CronProjectRow[]> {
  const rows: CronProjectRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + PROJECT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        wedding_date,
        created_at,
        account_id,
        accounts!inner(id, is_demo, kind)
      `,
      )
      .is("archived_at", null)
      .eq("accounts.is_demo", false)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as CronProjectRow[];
    rows.push(...page);
    if (page.length < PROJECT_PAGE_SIZE) break;
    from += PROJECT_PAGE_SIZE;
  }

  return rows;
}

/** Active, non-demo, non-archived projects. Shared by AGENT-01 / AGENT-02. */
export async function loadEligibleActiveProjects(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<CronProjectRow[]> {
  const projects = await loadActiveNonDemoProjects(supabase);
  return projects.filter((project) => {
    const account = asOne(project.accounts);
    return Boolean(account) && account?.is_demo !== true;
  });
}
