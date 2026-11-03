/**
 * AGENTIC-07 — seat unseated guests at standard tables.
 *
 * Pure and deterministic (no I/O, no randomness) so the same inputs always
 * give the same plan and it can be tested. Rules:
 *  - Already-seated people never move.
 *  - A household always sits together; "together" rules merge households.
 *  - "apart" rules are hard: two such people never share a table.
 *  - Side (partner_1 / partner_2) and relationship cluster softly.
 *  - A group that can't fit anywhere is reported, never split.
 */

export type SolverPerson = {
  id: string;
  name: string;
  guestId: string;
  side: string | null;
  relationship: string | null;
};

export type SolverTable = {
  id: string;
  label: string;
  seatCount: number;
  /** People already seated here (never moved) with their seat numbers. */
  seated: { memberId: string; seatIndex: number }[];
};

export type SolverRule = { kind: "together" | "apart"; a: string; b: string };

export type Placement = { memberId: string; tableId: string; seatIndex: number };

export type Unplaced = { memberIds: string[]; names: string[]; reason: string };

export type SolveResult = {
  placements: Placement[];
  unplaced: Unplaced[];
  notes: string[];
};

type Group = { members: SolverPerson[]; tableForced: string | null };

export function solveSeating(input: {
  tables: SolverTable[];
  /** Everyone on the guest list who might be seated (seated or not). */
  people: SolverPerson[];
  rules: SolverRule[];
}): SolveResult {
  const { tables, people, rules } = input;
  const byId = new Map(people.map((p) => [p.id, p]));
  const notes: string[] = [];

  // Where is everyone already seated?
  const seatedAt = new Map<string, string>(); // memberId -> tableId
  for (const t of tables) for (const s of t.seated) seatedAt.set(s.memberId, t.id);

  // Union-find: households + together rules.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  for (const p of people) parent.set(p.id, p.id);
  const firstOfGuest = new Map<string, string>();
  for (const p of people) {
    const first = firstOfGuest.get(p.guestId);
    if (first) union(first, p.id);
    else firstOfGuest.set(p.guestId, p.id);
  }
  for (const r of rules) {
    if (r.kind === "together" && byId.has(r.a) && byId.has(r.b)) union(r.a, r.b);
  }

  // Apart adjacency.
  const apart = new Map<string, Set<string>>();
  for (const r of rules) {
    if (r.kind !== "apart" || !byId.has(r.a) || !byId.has(r.b)) continue;
    if (!apart.has(r.a)) apart.set(r.a, new Set());
    if (!apart.has(r.b)) apart.set(r.b, new Set());
    apart.get(r.a)!.add(r.b);
    apart.get(r.b)!.add(r.a);
  }

  // Build groups of UNSEATED people.
  const groupsByRoot = new Map<string, Group>();
  for (const p of people) {
    if (seatedAt.has(p.id)) continue;
    const root = find(p.id);
    if (!groupsByRoot.has(root)) groupsByRoot.set(root, { members: [], tableForced: null });
    groupsByRoot.get(root)!.members.push(p);
  }
  // A group with someone already seated must join them.
  for (const [root, group] of groupsByRoot) {
    const tablesHere = new Map<string, number>();
    for (const p of people) {
      if (find(p.id) === root && seatedAt.has(p.id)) {
        const t = seatedAt.get(p.id)!;
        tablesHere.set(t, (tablesHere.get(t) ?? 0) + 1);
      }
    }
    if (tablesHere.size > 0) {
      const [best] = [...tablesHere.entries()].sort(
        (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
      );
      group.tableForced = best![0];
      if (tablesHere.size > 1) {
        notes.push(
          `${group.members[0]?.name ?? "A group"} is linked to people already seated at different tables; joined the larger set.`,
        );
      }
    }
  }

  // Table state.
  type TState = {
    t: SolverTable;
    used: Set<number>;
    present: Set<string>;
    order: number;
  };
  const state = new Map<string, TState>();
  tables.forEach((t, order) => {
    state.set(t.id, {
      t,
      used: new Set(t.seated.map((s) => s.seatIndex)),
      present: new Set(t.seated.map((s) => s.memberId)),
      order,
    });
  });

  const sideRelOf = (ids: Iterable<string>) => {
    const sides = new Map<string, number>();
    const rels = new Map<string, number>();
    for (const id of ids) {
      const p = byId.get(id);
      if (!p) continue;
      if (p.side) sides.set(p.side, (sides.get(p.side) ?? 0) + 1);
      if (p.relationship) rels.set(p.relationship, (rels.get(p.relationship) ?? 0) + 1);
    }
    return { sides, rels };
  };

  const hasApartConflict = (group: Group, s: TState) => {
    for (const m of group.members) {
      const enemies = apart.get(m.id);
      if (!enemies) continue;
      for (const e of enemies) if (s.present.has(e)) return true;
    }
    return false;
  };

  const free = (s: TState) => s.t.seatCount - s.used.size;

  // Largest groups first; stable by first member name/id.
  const groups = [...groupsByRoot.values()].sort(
    (a, b) =>
      b.members.length - a.members.length ||
      a.members[0]!.name.localeCompare(b.members[0]!.name) ||
      a.members[0]!.id.localeCompare(b.members[0]!.id),
  );

  const placements: Placement[] = [];
  const unplaced: Unplaced[] = [];

  for (const group of groups) {
    const size = group.members.length;
    const names = group.members.map((m) => m.name);
    const ids = group.members.map((m) => m.id);

    // Rules that contradict each other inside one group.
    let internalConflict = false;
    for (const m of group.members) {
      for (const e of apart.get(m.id) ?? []) {
        if (group.members.some((x) => x.id === e)) internalConflict = true;
      }
    }
    if (internalConflict) {
      unplaced.push({
        memberIds: ids,
        names,
        reason: "A 'keep apart' rule conflicts with their household or a 'keep together' rule.",
      });
      continue;
    }

    const candidates = group.tableForced
      ? [state.get(group.tableForced)].filter((s): s is TState => Boolean(s))
      : [...state.values()];

    let best: { s: TState; score: number; leftover: number } | null = null;
    for (const s of candidates) {
      if (free(s) < size) continue;
      if (hasApartConflict(group, s)) continue;

      const mine = sideRelOf(ids);
      const there = sideRelOf(s.present);
      const total = s.present.size;
      let score = 0;
      if (total > 0) {
        for (const [side, n] of mine.sides) {
          score += 3 * ((there.sides.get(side) ?? 0) / total) * (n / size);
        }
        for (const [rel, n] of mine.rels) {
          score += 1 * Math.min(1, (there.rels.get(rel) ?? 0) / total) * (n / size);
        }
      }
      const leftover = free(s) - size;
      if (
        !best ||
        score > best.score + 1e-9 ||
        (Math.abs(score - best.score) <= 1e-9 &&
          (leftover < best.leftover ||
            (leftover === best.leftover && s.order < best.s.order)))
      ) {
        best = { s, score, leftover };
      }
    }

    if (!best) {
      unplaced.push({
        memberIds: ids,
        names,
        reason: group.tableForced
          ? "Their table is full or has someone they must sit apart from."
          : size > Math.max(0, ...tables.map((t) => t.seatCount))
            ? `A group of ${size} is larger than any table.`
            : "No table has enough free seats without breaking a 'keep apart' rule.",
      });
      continue;
    }

    let next = 1;
    for (const m of group.members) {
      while (best.s.used.has(next)) next += 1;
      best.s.used.add(next);
      best.s.present.add(m.id);
      placements.push({ memberId: m.id, tableId: best.s.t.id, seatIndex: next });
    }
  }

  return { placements, unplaced, notes };
}
