export type ProjectAssignee = {
  userId: string;
  email: string;
  roleLabel: string;
};

const ROLE_ORDER = ["planner", "couple", "collaborator"];

export function emailInitials(email: string): string {
  const local = (email.split("@")[0] ?? "").trim();
  const parts = local.split(/[.\-_+\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

export function formatRoleLabel(roleLabel: string): string {
  if (!roleLabel) return "Other";
  return roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1);
}

export function groupAssignees(assignees: ProjectAssignee[]) {
  const groups = new Map<string, ProjectAssignee[]>();
  for (const person of assignees) {
    const bucket = groups.get(person.roleLabel) ?? [];
    bucket.push(person);
    groups.set(person.roleLabel, bucket);
  }

  for (const bucket of groups.values()) {
    bucket.sort((a, b) => a.email.localeCompare(b.email, "en-US"));
  }

  return [...groups.keys()]
    .sort((a, b) => {
      const ai = ROLE_ORDER.indexOf(a);
      const bi = ROLE_ORDER.indexOf(b);
      const av = ai === -1 ? ROLE_ORDER.length : ai;
      const bv = bi === -1 ? ROLE_ORDER.length : bi;
      return av - bv || a.localeCompare(b);
    })
    .map((roleLabel) => ({
      roleLabel,
      people: groups.get(roleLabel) ?? [],
    }));
}
