import { ArticleBody, partnerSlugsIn, readingMinutes } from "@/components/articles/article-body";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { PartnerSlot } from "@/components/partners/partner-slot";
import { getPartnersBySlugs } from "@/lib/partners-data";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatArticleDate, getArticleBySlug, getPublishedArticles } from "@/lib/articles/data";
import { pillarLabel } from "@/lib/articles/pillars";
import { PLAN_TOOLS } from "@/lib/plan-tools";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = await getArticleBySlug((await params).slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.dek ?? `${pillarLabel(article.pillar)} advice from First Look.`,
    path: `/ideas/${article.slug}`,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug);
  if (!article) notFound();

  const inlinePartners = await getPartnersBySlugs(partnerSlugsIn(article.body));
  const related = (await getPublishedArticles(article.pillar, 4))
    .filter((a) => a.slug !== article.slug)
    .slice(0, 3);
  const tools = PLAN_TOOLS.filter((t) => t.kind === "tool").slice(0, 3);
  const path = `/ideas/${article.slug}`;

  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd
        data={{
          ...articleJsonLd({
            headline: article.title,
            description: article.dek ?? article.title,
            path,
          }),
          datePublished: article.published_at,
          dateModified: article.updated_at,
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Ideas", path: "/ideas" },
          { name: article.title, path },
        ])}
      />
      <MarketingTopbar />
      <main>
        <article className="mx-auto max-w-[720px] px-6 pt-12 pb-10 md:pt-16">
          <Eyebrow className="mb-4 block">
            <Link href="/ideas" className="no-underline hover:text-ink">
              Ideas
            </Link>{" "}
            · {pillarLabel(article.pillar)}
          </Eyebrow>
          <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink md:text-[44px]">
            {article.title}
          </h1>
          {article.dek ? (
            <p className="mt-4 text-[18px] leading-relaxed text-muted">{article.dek}</p>
          ) : null}
          <p className="mt-4 text-[13.5px] text-muted">
            {formatArticleDate(article.published_at)} · {readingMinutes(article.body)} min read
          </p>
          <div className="mt-8">
            <ArticleBody source={article.body} partners={inlinePartners} />
          </div>
        </article>

        <section className="mx-auto max-w-[720px] px-6 pb-10">
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Plan it in First Look, free
            </h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
              A checklist built around your date, a budget tracker, guest list with RSVP, and your
              wedding website, all in one place.
            </p>
            <ButtonLink href="/login" variant="primary" className="mt-4">
              Start your free plan
            </ButtonLink>
          </div>
        </section>

        <section className="mx-auto max-w-[720px] px-6 pb-10 empty:hidden">
          <PartnerSlot placement="article" max={2} />
        </section>

        <section className="mx-auto max-w-[720px] px-6 pb-10">
          <NewsletterSignup source={`article:${article.slug}`.slice(0, 80)} compact />
        </section>

        <section className="mx-auto max-w-[720px] px-6 pb-16">
          <h2 className="text-[17px] font-bold text-ink">
            {related.length ? "Keep reading" : "Free tools"}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {(related.length
              ? related.map((r) => ({ href: `/ideas/${r.slug}`, title: r.title, body: r.dek ?? "" }))
              : tools
            ).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="marketing-card-hover block h-full rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
                >
                  <span className="block text-[15px] font-bold leading-snug text-ink">{item.title}</span>
                  {item.body ? (
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted">{item.body}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
