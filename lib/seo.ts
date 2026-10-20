import type { Metadata } from "next";

export const SITE_URL = "https://usefirstlook.app";
export const SITE_NAME = "First Look";
export const SITE_EMAIL = "hello@usefirstlook.app";

export const noIndexRobots = {
  robots: { index: false, follow: false },
} satisfies Pick<Metadata, "robots">;

export const MARKETING_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/for-planners", changeFrequency: "monthly", priority: 0.9 },
  { path: "/for-venues", changeFrequency: "monthly", priority: 0.9 },
  { path: "/for-couples", changeFrequency: "monthly", priority: 0.9 },
  { path: "/honeybook-alternative", changeFrequency: "monthly", priority: 0.8 },
  { path: "/dubsado-alternative", changeFrequency: "monthly", priority: 0.8 },
  { path: "/wedding-planner-crm", changeFrequency: "monthly", priority: 0.8 },
  {
    path: "/wedding-planner-contract-template",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/wedding-inquiry-pipeline",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/wedding-planning-checklist",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  { path: "/wedding-guest-list", changeFrequency: "monthly", priority: 0.7 },
  { path: "/wedding-seating-chart", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
  { path: "/wedding-budget-tracking", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
] as const;

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** Bypass the root "%s — First Look" title template. */
  absoluteTitle?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle,
}: PageMetadataInput): Metadata {
  const ogTitle = absoluteTitle ?? `${title} — ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export function absoluteUrl(path: string): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path}`;
}

export type FaqItem = { q: string; a: string };

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    email: SITE_EMAIL,
    logo: `${SITE_URL}/og-image.png`,
  };
}

export function softwareApplicationJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function howToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: readonly { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function articleJsonLd({
  headline,
  description,
  path,
}: {
  headline: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: absoluteUrl(path),
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
