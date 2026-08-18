import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/service-role";

export type InquiryLeadRow = {
  id: string;
  account_id: string;
  couple_name: string;
  contact_email: string | null;
  wedding_date: string | null;
  estimated_guest_count: number | null;
  source: string | null;
  notes: string | null;
  stage: string;
  accounts:
    | {
        id: string;
        name: string;
        kind: string;
        plan: string | null;
        brand_name: string | null;
        is_demo: boolean;
      }
    | {
        id: string;
        name: string;
        kind: string;
        plan: string | null;
        brand_name: string | null;
        is_demo: boolean;
      }[]
    | null;
};

const LEAD_PAGE_SIZE = 100;
const OPEN_DRAFT_PAGE_SIZE = 500;

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadOpenInquiryDraftTargetIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<Set<string>> {
  const ids = new Set<string>();
  let from = 0;
  for (;;) {
    const to = from + OPEN_DRAFT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("agent_drafts")
      .select("target_id")
      .eq("kind", "inquiry_reply")
      .in("status", ["pending", "approved"])
      .range(from, to);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    for (const row of page) {
      if (row.target_id) ids.add(row.target_id);
    }
    if (page.length < OPEN_DRAFT_PAGE_SIZE) break;
    from += OPEN_DRAFT_PAGE_SIZE;
  }
  return ids;
}

export async function loadEligibleInquiryLeads(
  supabase: ReturnType<typeof createServiceRoleClient>,
  filterLeadId?: string,
): Promise<InquiryLeadRow[]> {
  const openTargets = await loadOpenInquiryDraftTargetIds(supabase);
  const rows: InquiryLeadRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + LEAD_PAGE_SIZE - 1;
    let query = supabase
      .from("leads")
      .select(
        `
        id,
        account_id,
        couple_name,
        contact_email,
        wedding_date,
        estimated_guest_count,
        source,
        notes,
        stage,
        accounts!inner(id, name, kind, plan, brand_name, is_demo)
      `,
      )
      .eq("accounts.kind", "business")
      .eq("accounts.is_demo", false)
      .in("source", ["form", "email_inbound"])
      .in("stage", ["inquiry", "contacted"])
      .order("created_at", { ascending: true })
      .range(from, to);

    if (filterLeadId) {
      query = query.eq("id", filterLeadId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const page = (data ?? []) as InquiryLeadRow[];
    for (const row of page) {
      const account = asOne(row.accounts);
      if (!account || account.is_demo || account.kind !== "business") continue;
      if (openTargets.has(row.id)) continue;
      rows.push(row);
    }

    if (filterLeadId || page.length < LEAD_PAGE_SIZE) break;
    from += LEAD_PAGE_SIZE;
  }

  return rows;
}

export async function loadDateConflictProjectName(
  supabase: ReturnType<typeof createServiceRoleClient>,
  accountId: string,
  weddingDate: string | null,
): Promise<string | null> {
  if (!weddingDate) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("name")
    .eq("account_id", accountId)
    .eq("wedding_date", weddingDate)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.name ?? null;
}
