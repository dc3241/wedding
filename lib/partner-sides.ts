/** Stable partner-side tokens stored on guest_members.relationship_side. */
export type PartnerSideToken = "partner_1" | "partner_2";

export type ResolvedPartnerSides = {
  partner_1: string;
  partner_2: string;
  options: Array<{ token: PartnerSideToken; label: string }>;
};

function makeSides(partner1: string, partner2: string): ResolvedPartnerSides {
  return {
    partner_1: partner1,
    partner_2: partner2,
    options: [
      { token: "partner_1", label: partner1 },
      { token: "partner_2", label: partner2 },
    ],
  };
}

/** Strip a trailing calendar year ("Jordyn 2027" → "Jordyn"). */
function stripTrailingYear(part: string): string {
  return part.replace(/\s+\d{4}$/, "").trim();
}

/**
 * Split a project title into two partner names on "&" / "and".
 * Returns null when fewer or more than two usable parts.
 */
export function splitProjectNameIntoPartners(
  projectName: string | null | undefined,
): [string, string] | null {
  const raw = projectName?.trim();
  if (!raw) return null;

  const match = raw.match(/^(.+?)\s+(?:&|and)\s+(.+)$/i);
  if (!match) return null;

  const left = stripTrailingYear(match[1] ?? "");
  const right = stripTrailingYear(match[2] ?? "");
  if (!left || !right) return null;
  return [left, right];
}

export function isPartnerSideToken(
  value: string,
): value is PartnerSideToken {
  return value === "partner_1" || value === "partner_2";
}

/**
 * Resolve display labels for partner_1 / partner_2.
 * Order: (a) explicit partner-name inputs, (b) split projects.name,
 * (c) generic "Partner 1" / "Partner 2".
 * Labels are never stored — only the stable token is.
 */
export function resolvePartnerSides(input: {
  partner1Name?: string | null;
  partner2Name?: string | null;
  projectName?: string | null;
}): ResolvedPartnerSides {
  const fromProfile1 = input.partner1Name?.trim() || null;
  const fromProfile2 = input.partner2Name?.trim() || null;
  if (fromProfile1 && fromProfile2) {
    return makeSides(fromProfile1, fromProfile2);
  }

  const fromProject = splitProjectNameIntoPartners(input.projectName);
  if (fromProject) {
    return makeSides(fromProject[0], fromProject[1]);
  }

  return makeSides("Partner 1", "Partner 2");
}

export function labelForPartnerSide(
  sides: ResolvedPartnerSides,
  token: string | null | undefined,
): string | null {
  if (token === "partner_1") return sides.partner_1;
  if (token === "partner_2") return sides.partner_2;
  return null;
}
