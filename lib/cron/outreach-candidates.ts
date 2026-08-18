import "server-only";

import {
  parseLocalDateKey,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const OUTREACH_WINDOW_DAYS = 84;
export const REJECT_COOLDOWN_DAYS = 14;
export const QUIET_AFTER_SEND_DAYS = 14;

const NON_TERMINAL = new Set(["to_contact", "contacted"]);

export type OutreachCandidate = {
  vendor_id: string;
  project_vendor_id: string;
  name: string;
  category: string;
  category_id: string;
  status: string;
  contact_email: string;
  last_sent_at: string | null;
};

type TargetRow = { category: string; status: string };

type PvRow = {
  id: string;
  status: string;
  created_at: string;
  vendors:
    | {
        id: string;
        name: string;
        category: string | null;
        contact_email: string | null;
      }
    | {
        id: string;
        name: string;
        category: string | null;
        contact_email: string | null;
      }[]
    | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function daysUntil(weddingDate: string, todayKey: string): number {
  return Math.round(
    (parseLocalDateKey(weddingDate).getTime() -
      parseLocalDateKey(todayKey).getTime()) /
      86_400_000,
  );
}

export function isWithinOutreachWindow(
  weddingDate: string | null,
  todayKey: string = toLocalDateKey(new Date()),
): boolean {
  if (!weddingDate) return false;
  const days = daysUntil(weddingDate, todayKey);
  return days > 0 && days <= OUTREACH_WINDOW_DAYS;
}

function pickCandidate(
  rows: {
    vendor_id: string;
    project_vendor_id: string;
    name: string;
    category_id: string;
    status: string;
    contact_email: string;
    created_at: string;
  }[],
) {
  const contacted = rows.filter((row) => row.status === "contacted");
  const pool = contacted.length > 0 ? contacted : rows;
  return [...pool].sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.vendor_id.localeCompare(b.vendor_id);
  })[0];
}

export async function loadOutreachCandidates(
  supabase: ReturnType<typeof createServiceRoleClient>,
  projectId: string,
  accountId: string,
): Promise<OutreachCandidate[]> {
  const [{ data: targets, error: targetError }, { data: pvRows, error: pvError }] =
    await Promise.all([
      supabase
        .from("vendor_targets")
        .select("category, status")
        .eq("project_id", projectId),
      supabase
        .from("project_vendors")
        .select(
          "id, status, created_at, vendors(id, name, category, contact_email)",
        )
        .eq("project_id", projectId),
    ]);

  if (targetError) throw new Error(targetError.message);
  if (pvError) throw new Error(pvError.message);

  const targetList = (targets ?? []) as TargetRow[];
  if (targetList.length === 0) return [];

  const needed = targetList
    .filter((row) => row.status === "needed")
    .map((row) => row.category)
    .filter(Boolean);
  if (needed.length === 0) return [];

  const involvement = ((pvRows ?? []) as PvRow[]).flatMap((row) => {
    const vendor = asOne(row.vendors);
    if (!vendor) return [];
    return [
      {
        project_vendor_id: row.id,
        vendor_id: vendor.id,
        name: vendor.name,
        category_id: vendor.category ?? "",
        status: row.status,
        contact_email: vendor.contact_email?.trim() ?? "",
        created_at: row.created_at,
      },
    ];
  });

  const bookedCategories = new Set(
    involvement
      .filter((row) => row.status === "booked" && row.category_id)
      .map((row) => row.category_id),
  );

  const openCategories = [...new Set(needed)].filter(
    (category) => !bookedCategories.has(category),
  );
  if (openCategories.length === 0) return [];

  const cooldownStart = new Date(
    Date.now() - REJECT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const quietStart = new Date(
    Date.now() - QUIET_AFTER_SEND_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const vendorIds = [...new Set(involvement.map((row) => row.vendor_id))];
  const pvIds = involvement.map((row) => row.project_vendor_id);

  const [
    { data: rejected, error: rejectedError },
    { data: queued, error: queuedError },
    { data: sent, error: sentError },
  ] = await Promise.all([
    vendorIds.length
      ? supabase
          .from("agent_drafts")
          .select("target_id")
          .eq("account_id", accountId)
          .eq("kind", "vendor_outreach")
          .eq("status", "rejected")
          .gte("reviewed_at", cooldownStart)
          .in("target_id", vendorIds)
      : Promise.resolve({ data: [] as { target_id: string }[] | null, error: null }),
    vendorIds.length
      ? supabase
          .from("agent_drafts")
          .select("target_id")
          .eq("account_id", accountId)
          .eq("kind", "vendor_outreach")
          .in("status", ["pending", "approved"])
          .in("target_id", vendorIds)
      : Promise.resolve({ data: [] as { target_id: string }[] | null, error: null }),
    pvIds.length
      ? supabase
          .from("outreach_messages")
          .select("project_vendor_id, sent_at")
          .eq("direction", "outbound")
          .eq("status", "sent")
          .in("project_vendor_id", pvIds)
      : Promise.resolve({
          data: [] as { project_vendor_id: string; sent_at: string | null }[] | null,
          error: null,
        }),
  ]);

  if (rejectedError) throw new Error(rejectedError.message);
  if (queuedError) throw new Error(queuedError.message);
  if (sentError) throw new Error(sentError.message);

  const rejectedIds = new Set((rejected ?? []).map((row) => row.target_id));
  const queuedIds = new Set((queued ?? []).map((row) => row.target_id));
  const lastSentByPv = new Map<string, string>();
  for (const row of sent ?? []) {
    if (!row.sent_at) continue;
    const current = lastSentByPv.get(row.project_vendor_id);
    if (!current || row.sent_at > current) {
      lastSentByPv.set(row.project_vendor_id, row.sent_at);
    }
  }

  const candidates: OutreachCandidate[] = [];

  for (const category of openCategories) {
    const tracked = involvement.filter((row) => {
      if (row.category_id !== category) return false;
      if (!NON_TERMINAL.has(row.status)) return false;
      if (!row.contact_email) return false;
      if (rejectedIds.has(row.vendor_id)) return false;
      if (queuedIds.has(row.vendor_id)) return false;
      const lastSent = lastSentByPv.get(row.project_vendor_id);
      if (lastSent && lastSent >= quietStart) return false;
      return true;
    });
    if (tracked.length === 0) continue;

    const picked = pickCandidate(tracked);
    if (!picked) continue;

    candidates.push({
      vendor_id: picked.vendor_id,
      project_vendor_id: picked.project_vendor_id,
      name: picked.name,
      category_id: picked.category_id,
      category: vendorCategoryLabel(picked.category_id),
      status: picked.status,
      contact_email: picked.contact_email,
      last_sent_at: lastSentByPv.get(picked.project_vendor_id) ?? null,
    });
  }

  return candidates;
}
