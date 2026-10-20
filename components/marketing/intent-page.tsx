import { DemoCta } from "@/components/demo/demo-cta";
import { FinalCta } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { DemoAccountKind } from "@/lib/demo/types";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  type FaqItem,
} from "@/lib/seo";
import Link from "next/link";

export type IntentStep = { name: string; text: string };

export type IntentSection = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets?: readonly string[];
  steps?: readonly IntentStep[];
  note?: string;
};

export type IntentRelated = { href: string; label: string };

export type IntentPageProps = {
  path: string;
  breadcrumbName: string;
  eyebrow: string;
  h1: string;
  lede: string;
  demoKind: DemoAccountKind;
  ctaLabel?: string;
  appDescription: string;
  sections: readonly IntentSection[];
  faqs: readonly FaqItem[];
  related: readonly IntentRelated[];
  extraJsonLd?: object | readonly object[];
  finalTitle?: string;
  finalSubhead?: string;
};

export function IntentPage({
  path,
  breadcrumbName,
  eyebrow,
  h1,
  lede,
  demoKind,
  ctaLabel = "Start free",
  appDescription,
  sections,
  faqs,
  related,
  extraJsonLd,
  finalTitle,
  finalSubhead,
}: IntentPageProps) {
  const extras = extraJsonLd
    ? Array.isArray(extraJsonLd)
      ? extraJsonLd
      : [extraJsonLd]
    : [];

  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd(appDescription)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: breadcrumbName, path },
        ])}
      />
      {extras.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
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
                {ctaLabel}
              </ButtonLink>
              <DemoCta kind={demoKind} compact />
            </div>
          </ScrollReveal>
        </section>

        {sections.map((section) => (
          <section
            key={section.title}
            className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16"
          >
            <ScrollReveal className="mx-auto max-w-[52ch] text-center">
              {section.eyebrow ? (
                <Eyebrow className="mb-4 block">{section.eyebrow}</Eyebrow>
              ) : null}
              <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
                {section.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
                {section.body}
              </p>
            </ScrollReveal>
            {section.bullets ? (
              <ul className="mx-auto mt-8 max-w-3xl space-y-2">
                {section.bullets.map((item) => (
                  <li
                    key={item}
                    className="rounded-[var(--radius-inner)] bg-well px-5 py-3.5 text-[15px] leading-relaxed text-ink shadow-recessed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.steps ? (
              <ol className="mx-auto mt-8 max-w-3xl space-y-3">
                {section.steps.map((step, index) => (
                  <li
                    key={step.name}
                    className="rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed"
                  >
                    <p className="text-[13px] font-semibold tabular-nums text-accent">
                      {index + 1}. {step.name}
                    </p>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
                      {step.text}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
            {section.note ? (
              <p className="mx-auto mt-6 max-w-[52ch] text-center text-[13px] leading-relaxed text-muted">
                {section.note}
              </p>
            ) : null}
          </section>
        ))}

        {related.length > 0 ? (
          <section className="mx-auto max-w-3xl px-6 pb-4 md:px-10">
            <p className="text-center text-[13px] font-semibold tracking-[0.09em] text-accent uppercase">
              Related
            </p>
            <ul className="mt-4 flex flex-col items-center gap-2 text-[15px]">
              {related.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    {item.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <MarketingFaq items={faqs} />

        <FinalCta
          {...(finalTitle
            ? { title: finalTitle }
            : demoKind === "personal"
              ? { title: "Start planning in minutes." }
              : {})}
          {...(finalSubhead
            ? { subhead: finalSubhead }
            : demoKind === "personal"
              ? {
                  subhead:
                    "Free to begin. Upgrade when you're ready — no card required.",
                }
              : {})}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
