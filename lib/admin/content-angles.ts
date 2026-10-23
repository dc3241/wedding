/**
 * Shortlist uniqueness: topic families, spent claims, and shown-copy overlap.
 * Generation must not re-serve a hook the team has already seen.
 */

/** Topics that collapse to the same claim. Using one burns the family. */
export const TOPIC_FAMILIES: readonly (readonly string[])[] = [
  ["dayof-buffer", "timeline-photos", "timeline-photo-gap"],
  ["seating-family", "seating-politics"],
  ["rsvp-chase", "rsvp-texts"],
  ["website-guests", "website-texts"],
  ["budget-deposits", "budget-deposit"],
];

const FAMILY_BY_KEY = new Map<string, readonly string[]>();
for (const family of TOPIC_FAMILIES) {
  for (const key of family) FAMILY_BY_KEY.set(key, family);
}

export function familyKeysFor(key: string): string[] {
  return [...(FAMILY_BY_KEY.get(key) ?? [key])];
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "is",
  "are",
  "that",
  "this",
  "with",
  "your",
  "you",
  "it",
  "its",
  "as",
  "at",
  "be",
  "by",
  "from",
  "not",
  "but",
  "if",
  "then",
  "than",
  "into",
  "out",
  "up",
  "so",
  "was",
  "were",
  "has",
  "have",
  "had",
  "will",
  "can",
  "do",
  "does",
  "did",
  "their",
  "them",
  "they",
  "we",
  "our",
  "when",
  "what",
  "who",
  "how",
  "why",
  "about",
  "after",
  "before",
  "while",
  "still",
  "just",
  "more",
  "most",
  "also",
  "only",
  "over",
  "into",
  "wedding",
  "weddings",
  "couple",
  "couples",
  "guest",
  "guests",
]);

export type RetiredClaim = {
  id: string;
  label: string;
  prompt: string;
  test: (text: string) => boolean;
};

/** Claims that already ran and must not be the hook again. */
export const RETIRED_CLAIMS: readonly RetiredClaim[] = [
  {
    id: "photo-gap-15-vs-45",
    label: "15-minute ceremony-to-reception photo-gap buffer",
    prompt:
      "Do not write the '15 minutes of buffer is enough for the photo gap between ceremony and reception / plan 45 minutes for portraits' myth. Timeline and day-of tips are fine. That specific 15-vs-45 photo-gap hook is spent.",
    test: isPhotoGap15Myth,
  },
];

export function normalizeCopy(text: string): string {
  return text
    .toLowerCase()
    .replace(/fifteen/g, "15")
    .replace(/forty[\s-]*five/g, "45")
    .replace(/\bmins?\b/g, "minutes")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPhotoGap15Myth(text: string): boolean {
  const normalized = normalizeCopy(text);
  const has15 = /\b15 minutes?\b/.test(normalized);
  const has45 = /\b45 minutes?\b/.test(normalized);
  const hasBufferOrGap = /\b(buffer|gap)\b/.test(normalized);
  const photoish = /\b(photo|photos|portrait|portraits|ceremony|reception|cocktail)\b/.test(
    normalized,
  );
  return (has15 && hasBufferOrGap && photoish) || (has15 && has45 && photoish);
}

export function significantTokens(text: string): string[] {
  return normalizeCopy(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP.has(token) && !/^\d+$/.test(token));
}

export function numberUnits(text: string): string[] {
  const matches = normalizeCopy(text).matchAll(/(\d+)\s*minutes?/g);
  return [...matches].map((match) => `${match[1]}:minutes`);
}

export function retiredClaimFor(text: string): RetiredClaim | null {
  return RETIRED_CLAIMS.find((claim) => claim.test(text)) ?? null;
}

export function copiesOverlap(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  if (normalizeCopy(a) === normalizeCopy(b)) return true;
  if (retiredClaimFor(a) && retiredClaimFor(a)?.id === retiredClaimFor(b)?.id) {
    return true;
  }

  const unitsA = new Set(numberUnits(a));
  const unitsB = new Set(numberUnits(b));
  const sharedUnits = [...unitsA].filter((unit) => unitsB.has(unit));
  const tokensA = new Set(significantTokens(a));
  const tokensB = new Set(significantTokens(b));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return sharedUnits.length >= 2;
  }

  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(tokensA.size, tokensB.size);
  if (sharedUnits.length >= 2 && containment >= 0.28) return true;
  return jaccard >= 0.5 || containment >= 0.72;
}

export function repeatsShownCopy(text: string, shown: readonly string[]): boolean {
  if (retiredClaimFor(text)) return true;
  return shown.some((row) => copiesOverlap(text, row));
}

export function uniqueTexts(
  values: Array<string | null | undefined>,
  limit: number,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = value?.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const key = normalizeCopy(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

export function retiredClaimPromptBlock(): string {
  return [
    "Retired hooks (never use these claims, even on a timeline or buffer topic):",
    ...RETIRED_CLAIMS.map((claim) => `- ${claim.prompt}`),
  ].join("\n");
}

export function shownCopyPromptBlock(shown: readonly string[]): string {
  if (shown.length === 0) return "";
  return [
    "Already shown — do not repeat these hooks, claims, distinctive numbers, or a close paraphrase:",
    ...shown.map((text) => `- "${text}"`),
  ].join("\n");
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/**
 * Prefer topics the shortlist has not used recently. A family member counts
 * as the same topic. Mutates `usedKeys` with every picked key and its family.
 */
export function pickLeastRecentTopics<T extends { key: string }>(
  list: readonly T[],
  count: number,
  usedKeys: Set<string>,
  recentKeys: readonly string[],
): T[] {
  if (list.length === 0 || count <= 0) return [];

  const recentRank = new Map<string, number>();
  recentKeys.forEach((key, index) => {
    for (const related of familyKeysFor(key)) {
      if (!recentRank.has(related)) recentRank.set(related, index);
    }
  });

  const rankOf = (key: string): number => {
    let best = Number.POSITIVE_INFINITY;
    for (const related of familyKeysFor(key)) {
      const rank = recentRank.get(related);
      if (rank !== undefined && rank < best) best = rank;
    }
    return best;
  };

  const taken = (key: string) =>
    familyKeysFor(key).some((related) => usedKeys.has(related));

  const available = list.filter((topic) => !taken(topic.key));
  const pool = available.length > 0 ? available : list;

  const grouped = new Map<number, T[]>();
  for (const topic of pool) {
    const rank = rankOf(topic.key);
    const bucket = grouped.get(rank) ?? [];
    bucket.push(topic);
    grouped.set(rank, bucket);
  }

  const out: T[] = [];
  const ranks = [...grouped.keys()].sort((a, b) => b - a);
  for (const rank of ranks) {
    const bucket = shuffleInPlace([...(grouped.get(rank) ?? [])]);
    for (const topic of bucket) {
      if (out.length >= count) break;
      if (out.some((row) => row.key === topic.key)) continue;
      if (available.length > 0 && taken(topic.key)) continue;
      out.push(topic);
      for (const related of familyKeysFor(topic.key)) usedKeys.add(related);
    }
    if (out.length >= count) break;
  }

  while (out.length < count) {
    const topic = list[out.length % list.length]!;
    out.push(topic);
    for (const related of familyKeysFor(topic.key)) usedKeys.add(related);
  }
  return out;
}
