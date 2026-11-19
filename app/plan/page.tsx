import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { PartnerSlot } from "@/components/partners/partner-slot";
import { PlanToolGrid } from "@/components/plan/plan-tool-grid";
import { Eyebrow } from "@/components/ui/eyebrow";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Free Wedding Planning Tools",
  description:
    "Free wedding planning tools: a venue match quiz, wedding cost calculator, alcohol calculator, vendor directory, checklist, budget tracker and more. No sign-up to use them.",
  path: "/plan",
});

export default function PlanHubPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Planning tools", path: "/plan" },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 md:px-10 md:pt-16">
          <Eyebrow className="mb-4 block">Free planning tools</Eyebrow>
          <h1 className="max-w-[20ch] text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[50px]">
            Plan your wedding without paying a planner.
          </h1>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted md:text-[17px]">
            Calculators, a venue quiz and a vendor directory you can use right now, plus guides to
            the planning app when you&apos;re ready to keep it all in one place.
          </p>
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-12 md:px-10">
          <PlanToolGrid />
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-10 empty:hidden md:px-10">
          <PartnerSlot placement="plan-hub" />
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10">
          <NewsletterSignup source="plan-hub" />
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
