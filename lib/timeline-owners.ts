/**
 * timeline_events.owner is free text at rest and a comma-separated SET at read.
 * This module is the single parser — nowhere else may split/parse an owner string.
 */

/** Parse a stored owner field into ordered, de-duped tokens. */
export function parseOwners(raw: string | null | undefined): string[] {
  if (raw == null) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of trimmed.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
}

/** Case-insensitive membership of `owner` in parseOwners(raw). */
export function eventHasOwner(
  raw: string | null | undefined,
  owner: string,
): boolean {
  const needle = owner.trim();
  if (!needle) return false;
  const needleKey = needle.toLowerCase();
  return parseOwners(raw).some((token) => token.toLowerCase() === needleKey);
}

/**
 * Union of parseOwners across inputs. First-seen casing wins; result sorted
 * alphabetically (case-insensitive) for stable dropdown order.
 */
export function collectOwners(
  raws: (string | null | undefined)[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of raws) {
    for (const token of parseOwners(raw)) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(token);
    }
  }
  result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return result;
}
