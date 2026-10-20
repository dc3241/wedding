import { DemoCta } from "@/components/demo/demo-cta";
import { FinalCta } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  type FaqItem,
} from "@/lib/seo";
import Link from "next/link";

export type ComparisonRow = {
  label: string;
  them: string;
  us: string;
};

export type AlternativePageProps = {
  competitor: string;
  path: string;
  eyebrow: string;
  h1: string;
  lede: string;
  rows: readonly ComparisonRow[];
  whoItsFor: string;
  whoStays: string;
  faqs: readonly FaqItem[];
};

export function AlternativePage({
  competitor,
  path,
  eyebrow,
  h1,
  lede,
  rows,
  whoItsFor,
  whoStays,
  faqs,
}: AlternativePageProps) {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={softwareApplicationJsonLd(
          `First Look is a wedding planning CRM alternative to ${competitor}: lead, payment, and the wedding workbook in one platform.`,
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: `${competitor} alternative`, path },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[48ch] text-center">
            <Eyebrow className="mb-5 block">{eyebrow}</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              {h1}
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              {lede}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/login"
                variant="primary"
                className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
              >
                Start free
              </ButtonLink>
              <DemoCta kind="business" compact />
            </div>
          </ScrollReveal>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
          <div className="mx-auto mb-9 max-w-[52ch] text-center">
            <Eyebrow className="mb-4 block">Side by side</Eyebrow>
            <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
              Where {competitor} stops, the wedding still has to happen.
            </h2>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <article
                key={row.label}
                className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised"
              >
                <h3 className="text-[15px] font-extrabold text-ink">
                  {row.label}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  <span className="font-semibold text-ink">{competitor}: </span>
                  {row.them}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold">First Look: </span>
                  {row.us}
                </p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised md:block">
            <div className="grid grid-cols-3 border-b border-hairline px-7 py-3 text-[12px] font-semibold tracking-[0.09em] text-accent uppercase">
              <span>Capability</span>
              <span>{competitor}</span>
              <span>First Look</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 border-b border-hairline px-7 py-4 last:border-b-0"
              >
                <p className="pr-4 text-[15px] font-semibold text-ink">
                  {row.label}
                </p>
                <p className="pr-4 text-[14px] leading-relaxed text-muted">
                  {row.them}
                </p>
                <p className="text-[14px] leading-relaxed text-ink">{row.us}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-[52ch] text-center text-[13px] leading-relaxed text-muted">
            Feature summaries are based on {competitor}&apos;s publicly
            advertised product. First Look is wedding-specific; {competitor}{" "}
            serves a broader set of service businesses.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <article className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:p-7">
              <Eyebrow className="mb-4 block">Switch if</Eyebrow>
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                You want one platform for the booking and the wedding.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {whoItsFor}
              </p>
            </article>
            <article className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:p-7">
              <Eyebrow className="mb-4 block">Stay if</Eyebrow>
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                You need a general CRM, not a wedding workbook.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                {whoStays}
              </p>
            </article>
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/for-planners"
              className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              See the wedding planner CRM →
            </Link>
          </p>
          <p className="mt-3 text-center">
            <Link
              href="/wedding-planner-crm"
              className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              What to look for in a wedding planner CRM →
            </Link>
          </p>
          <p className="mt-3 text-center text-[14px] text-muted">
            {competitor === "HoneyBook" ? (
              <>
                Also see our{" "}
                <Link
                  href="/dubsado-alternative"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Dubsado alternative
                </Link>
              </>
            ) : (
              <>
                Also see our{" "}
                <Link
                  href="/honeybook-alternative"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  HoneyBook alternative
                </Link>
              </>
            )}
          </p>
        </section>

        <MarketingFaq items={faqs} />

        <FinalCta
          eyebrow="Ready when you are"
          title="Lead to payment to workbook."
          subhead="Free to start. Bring your first client — no card required."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
