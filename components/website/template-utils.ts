export function formatWeddingDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntilWedding(weddingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(weddingDate + "T00:00:00");
  wedding.setHours(0, 0, 0, 0);
  const diff = wedding.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export type SplitCoupleNames =
  | { kind: "pair"; first: string; second: string }
  | { kind: "combined"; text: string };

export function splitCoupleNames(names: string): SplitCoupleNames {
  const trimmed = names.trim();
  if (!trimmed) return { kind: "combined", text: "Your names" };

  const match = trimmed.match(/^(.+?)\s*(?:&|and)\s*(.+)$/i);
  if (match) {
    return { kind: "pair", first: match[1].trim(), second: match[2].trim() };
  }

  return { kind: "combined", text: trimmed };
}
