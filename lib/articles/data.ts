import "server-only";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type ArticleSummary = {
  slug: string;
  title: string;
  dek: string | null;
  pillar: string;
  published_at: string;
};

export type Article = ArticleSummary & { body: string; updated_at: string };

/** Public reads go through published-only definer RPCs (MEDIA-05). */
export async function getPublishedArticles(
  pillar: string | null = null,
  limit = 60,
): Promise<ArticleSummary[]> {
  const { data, error } = await createAnonServerClient().rpc("articles_published", {
    p_pillar: pillar,
    p_limit: limit,
  });
  if (error) {
    console.error("articles_published:", error.message);
    return [];
  }
  return (data ?? []) as ArticleSummary[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await createAnonServerClient().rpc("article_by_slug", { p_slug: slug });
  if (error) {
    console.error("article_by_slug:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as Article | undefined) ?? null;
}

export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
