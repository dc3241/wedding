import type { MetadataRoute } from "next";
import { getPublishedSlugs, getStateCounts } from "@/lib/directory/data";
import { DIRECTORY_STATES, stateByCode } from "@/lib/directory/states";
import { absoluteUrl, MARKETING_ROUTES } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketing: MetadataRoute.Sitemap = MARKETING_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [counts, slugs] = await Promise.all([getStateCounts(), getPublishedSlugs()]);

  const directory: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/wedding-vendors"), changeFrequency: "weekly", priority: 0.8 },
    ...DIRECTORY_STATES.filter((s) => (counts[s.code] ?? 0) > 0).map((s) => ({
      url: absoluteUrl(`/wedding-vendors/${s.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
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

  return [...marketing, ...directory];
}
