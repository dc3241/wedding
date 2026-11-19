import type { MetadataRoute } from "next";
import { MIN_INDEXABLE_LISTINGS, VENDOR_CATEGORIES } from "@/lib/directory/categories";
import { getCategoryCounts, getPublishedSlugs, getStateCounts } from "@/lib/directory/data";
import { DIRECTORY_STATES, stateByCode } from "@/lib/directory/states";
import { getPublishedArticles } from "@/lib/articles/data";
import { getDirectoryCities, isIndexableCity } from "@/lib/directory/cities";
import { absoluteUrl, MARKETING_ROUTES } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketing: MetadataRoute.Sitemap = MARKETING_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [counts, slugs, catCounts] = await Promise.all([
    getStateCounts(),
    getPublishedSlugs(),
    getCategoryCounts(),
  ]);

  const directory: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/wedding-vendors"), changeFrequency: "weekly", priority: 0.8 },
    ...DIRECTORY_STATES.filter((s) => (counts[s.code] ?? 0) > 0).map((s) => ({
      url: absoluteUrl(`/wedding-vendors/${s.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Category pages only once they have enough listings to be indexable.
    ...DIRECTORY_STATES.flatMap((s) =>
      VENDOR_CATEGORIES.filter(
        (c) =>
          c.categories.reduce((n, id) => n + (catCounts[s.code]?.[id] ?? 0), 0) >=
          MIN_INDEXABLE_LISTINGS,
      ).map((c) => ({
        url: absoluteUrl(`/wedding-vendors/${s.slug}/${c.path}`),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ),
    ...slugs.flatMap(({ slug, state }) => {
      const s = stateByCode(state);
      return s
        ? [
            {
              url: absoluteUrl(`/wedding-vendors/${s.slug}/${slug}`),
              changeFrequency: "monthly" as const,
              priority: 0.5,
            },
          ]
        : [];
    }),
  ];

  const articles: MetadataRoute.Sitemap = (await getPublishedArticles(null, 200)).map((a) => ({
    url: absoluteUrl(`/ideas/${a.slug}`),
    lastModified: a.published_at,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const cities: MetadataRoute.Sitemap = (await getDirectoryCities())
    .filter(isIndexableCity)
    .flatMap((c) => {
      const s = stateByCode(c.state);
      return s
        ? [
            {
              url: absoluteUrl(`/wedding-vendors/${s.slug}/city/${c.slug}`),
              changeFrequency: "weekly" as const,
              priority: 0.6,
            },
          ]
        : [];
    });

  return [...marketing, ...directory, ...cities, ...articles];
}
