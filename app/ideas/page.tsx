import { ArticleList } from "@/components/articles/article-list";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatArticleDate, getPublishedArticles } from "@/lib/articles/data";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planning Ideas & Advice",
  description:
    "Wedding planning advice for couples doing it themselves: budgets, timelines, guest lists, vendors, real weddings and ways to save.",
  path: "/ideas",
});

export default async function IdeasPage() {
  const articles = await getPublishedArticles(null, 200);

  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Ideas", path: "/ideas" },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 md:px-10 md:pt-16">
          <Eyebrow className="mb-4 block">Ideas & advice</Eyebrow>
          <h1 className="max-w-[22ch] text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[50px]">
            Wedding planning advice, without the fluff.
          </h1>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted md:text-[17px]">
            What to book when, what things really cost, and how couples pull it off without a
            planner.
          </p>
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-12 md:px-10">
          {articles.length ? (
            <ArticleList
              articles={articles.map((a) => ({
                slug: a.slug,
                title: a.title,
                dek: a.dek,
                pillar: a.pillar,
                date: formatArticleDate(a.published_at),
              }))}
            />
          ) : (
            <div className="rounded-[var(--radius-card)] bg-surface p-8 shadow-raised">
              <h2 className="text-[20px] font-extrabold text-ink">The first articles are on the way.</h2>
              <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
                In the meantime, try the{" "}
                <Link href="/plan" className="font-semibold text-accent hover:underline">
                  free planning tools
                </Link>
                , or join the letter below to get them as they come out.
              </p>
            </div>
          )}
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10">
          <NewsletterSignup source="ideas" />
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
