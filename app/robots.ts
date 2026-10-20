import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/dashboard",
        "/projects",
        "/account",
        "/leads",
        "/invoices",
        "/automations",
        "/money",
        "/onboarding",
        "/vendors",
        "/contracts",
        "/calendar",
        "/api/",
        "/styleguide",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
