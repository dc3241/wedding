/** MEDIA-05: article pillars. Keep in step with the articles_pillar_values CHECK. */
export const ARTICLE_PILLARS = [
  { id: "planning", label: "Planning basics" },
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "guests", label: "Guests" },
  { id: "vendors", label: "Vendors" },
  { id: "real-weddings", label: "Real weddings" },
  { id: "saving", label: "Saving money" },
] as const;

export type ArticlePillar = (typeof ARTICLE_PILLARS)[number]["id"];

export function isArticlePillar(v: string): v is ArticlePillar {
  return ARTICLE_PILLARS.some((p) => p.id === v);
}

export function pillarLabel(id: string): string {
  return ARTICLE_PILLARS.find((p) => p.id === id)?.label ?? "Planning";
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}
