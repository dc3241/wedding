import "server-only";

import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  solveSeating,
  type Placement,
  type SolverPerson,
  type SolverRule,
  type SolverTable,
} from "@/lib/seating/solve";

/** AGENTIC-07 — load seating data, run the solver, queue a proposal. */

export type SeatingPlanPayload = {
  includePending: boolean;
  placements: {
    memberId: string;
    name: string;
    tableId: string;
    tableLabel: string;
    seatIndex: number;
  }[];
  unplaced: { names: string[]; reason: string }[];
  notes: string[];
};

export function describeSeatingPlan(payload: SeatingPlanPayload): string[] {
  const byTable = new Map<string, string[]>();
  for (const p of payload.placements) {
    const list = byTable.get(p.tableLabel) ?? [];
    list.push(p.name);
    byTable.set(p.tableLabel, list);
  }
  const lines = [...byTable.entries()].map(
    ([label, names]) =>
      `${label}: ${names.slice(0, 8).join(", ")}${names.length > 8 ? `, +${names.length - 8} more` : ""}`,
  );
  for (const u of payload.unplaced) {
    lines.push(`Not seated: ${u.names.slice(0, 4).join(", ")}${u.names.length > 4 ? ", ..." : ""} (${u.reason})`);
  }
  for (const note of payload.notes) lines.push(note);
  return lines;
}

export type CreateSeatingPlanResult =
  | {
      ok: true;
      proposalId: string;
      seated: number;
      unplaced: { names: string[]; reason: string }[];
    }
  | { ok: false; error: string };

type MemberRow = {
  id: string;
  name: string | null;
  guest_id: string;
  relationship: string | null;
  relationship_side: string | null;
  guests: { rsvp_status: string } | { rsvp_status: string }[] | null;
};

export async function createSeatingPlanProposal(
  projectId: string,
  input: { includePending?: boolean },
  client?: SupabaseClient,
): Promise<CreateSeatingPlanResult> {
  const includePending = input.includePending === true;
  const supabase = await clientForWrite(client);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { ok: false, error: projectError.message };
  if (!project) return { ok: false, error: "Project not found." };

  const [tablesResult, membersResult, assignmentsResult, rulesResult] =
    await Promise.all([
      supabase
        .from("seating_tables")
        .select("id, label, seat_count, kind")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("guest_members")
        .select("id, name, guest_id, relationship, relationship_side, guests ( rsvp_status )")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("seating_assignments")
        .select("table_id, guest_member_id, seat_index")
        .eq("project_id", projectId),
      supabase
        .from("seating_rules")
        .select("kind, member_a, member_b")
        .eq("project_id", projectId),
    ]);
  for (const r of [tablesResult, membersResult, assignmentsResult, rulesResult]) {
    if (r.error) return { ok: false, error: r.error.message };
  }

  const standardTables = (tablesResult.data ?? []).filter((t) => t.kind === "standard");
  if (standardTables.length === 0) {
    return {
      ok: false,
      error:
        "There are no standard tables yet. Add tables on the Seating tab first (head, sweetheart and dancefloor are not auto-seated).",
    };
  }
  const tableLabel = new Map(standardTables.map((t) => [t.id as string, String(t.label)]));

  const assignments = (assignmentsResult.data ?? []).filter(
    (a) => a.guest_member_id && tableLabel.has(a.table_id as string),
  );
  const seatedIds = new Set(assignments.map((a) => a.guest_member_id as string));
  // Anyone seated anywhere (incl. head/sweetheart) is "already placed".
  const seatedAnywhere = new Set(
    (assignmentsResult.data ?? []).map((a) => a.guest_member_id as string),
  );

  const eligible = (m: MemberRow) => {
    const guest = Array.isArray(m.guests) ? m.guests[0] : m.guests;
    const status = guest?.rsvp_status;
    return status === "attending" || (includePending && status === "pending");
  };

  const members = (membersResult.data ?? []) as unknown as MemberRow[];
  const people: SolverPerson[] = members
    .filter((m) => seatedIds.has(m.id) || (eligible(m) && !seatedAnywhere.has(m.id)))
    .map((m) => ({
      id: m.id,
      name: m.name?.trim() || "Guest",
      guestId: m.guest_id,
      side: m.relationship_side,
      relationship: m.relationship,
    }));

  const unseatedEligible = people.filter((p) => !seatedIds.has(p.id));
  if (unseatedEligible.length === 0) {
    return {
      ok: false,
      error: includePending
        ? "Everyone who is attending or pending already has a seat."
        : "Everyone who has RSVPed yes already has a seat. (Pass include_pending to also seat people who haven't answered.)",
    };
  }

  const tables: SolverTable[] = standardTables.map((t) => ({
    id: t.id as string,
    label: String(t.label),
    seatCount: Number(t.seat_count),
    seated: assignments
      .filter((a) => a.table_id === t.id && Number.isInteger(Number(a.seat_index)))
      .map((a) => ({ memberId: a.guest_member_id as string, seatIndex: Number(a.seat_index) })),
  }));

  const rules: SolverRule[] = (rulesResult.data ?? []).map((r) => ({
    kind: r.kind as "together" | "apart",
    a: r.member_a as string,
    b: r.member_b as string,
  }));

  const result = solveSeating({ tables, people, rules });
  if (result.placements.length === 0) {
    return {
      ok: false,
      error: `Couldn't seat anyone: ${result.unplaced
        .slice(0, 3)
        .map((u) => `${u.names.join(", ")} (${u.reason})`)
        .join("; ")}`,
    };
  }

  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const payload: SeatingPlanPayload = {
    includePending,
    placements: result.placements.map((p: Placement) => ({
      memberId: p.memberId,
      name: nameOf.get(p.memberId) ?? "Guest",
      tableId: p.tableId,
      tableLabel: tableLabel.get(p.tableId) ?? "Table",
      seatIndex: p.seatIndex,
    })),
    unplaced: result.unplaced.map((u) => ({ names: u.names, reason: u.reason })),
    notes: result.notes,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: inserted, error: insertError } = await supabase
    .from("assistant_proposals")
    .insert({
      account_id: project.account_id,
      project_id: projectId,
      kind: "seating_plan",
      title: `Seat ${payload.placements.length} guest${payload.placements.length === 1 ? "" : "s"}`,
      summary: "Households stay together; existing seats don't move.",
      payload,
      status: "pending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not save the proposal." };
  }
  return {
    ok: true,
    proposalId: inserted.id,
    seated: payload.placements.length,
    unplaced: payload.unplaced,
  };
}

/** Find people by name so the assistant can pass real member ids. */
export async function findGuestMembers(
  supabase: SupabaseClient,
  projectId: string,
  query: string,
) {
  const q = query.trim();
  if (q.length < 2) return { error: "query must be at least 2 characters" };
  const { data, error } = await supabase
    .from("guest_members")
    .select("id, name, guests ( full_name, household )")
    .eq("project_id", projectId)
    .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
    .limit(10);
  if (error) return { error: error.message };
  return {
    matches: (data ?? []).map((m) => {
      const guest = Array.isArray(m.guests) ? m.guests[0] : m.guests;
      return {
        member_id: m.id,
        name: m.name,
        household: guest?.household ?? guest?.full_name ?? null,
      };
    }),
  };
}

export type AddSeatingRuleResult =
  | { ok: true; ruleId: string }
  | { ok: false; error: string };

export async function addSeatingRule(
  projectId: string,
  input: { kind: string; memberA: string; memberB: string; note?: string },
  client?: SupabaseClient,
): Promise<AddSeatingRuleResult> {
  if (input.kind !== "together" && input.kind !== "apart") {
    return { ok: false, error: "kind must be together or apart." };
  }
  if (input.memberA === input.memberB) {
    return { ok: false, error: "Pick two different people." };
  }
  const supabase = await clientForWrite(client);
  const { data: found, error: findError } = await supabase
    .from("guest_members")
    .select("id")
    .eq("project_id", projectId)
    .in("id", [input.memberA, input.memberB]);
  if (findError) return { ok: false, error: findError.message };
  if ((found ?? []).length !== 2) {
    return { ok: false, error: "Both people must be on this guest list. Use find_guests for ids." };
  }
  const [a, b] = [input.memberA, input.memberB].sort();
  const { data, error } = await supabase
    .from("seating_rules")
    .insert({
      project_id: projectId,
      kind: input.kind,
      member_a: a,
      member_b: b,
      note: input.note?.trim().slice(0, 200) || null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That rule already exists." };
    return { ok: false, error: error.message };
  }
  return { ok: true, ruleId: data.id };
}
