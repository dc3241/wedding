import type { MetadataRoute } from "next";
import { absoluteUrl, MARKETING_ROUTES } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
