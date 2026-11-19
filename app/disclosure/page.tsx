import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Affiliate & Sponsor Disclosure",
  description:
    "How First Look makes money from affiliate links, sponsors and featured vendor listings, and what never changes because of it.",
  path: "/disclosure",
});

const POINTS = [
  {
    title: "Affiliate links",
    body: "Some links to products and services are affiliate links. If you buy through one, we may earn a commission, at no extra cost to you. These are always labeled “Partner picks” or “we may earn a commission.”",
  },
  {
    title: "Sponsors",
    body: "Some placements are paid for by a sponsor. They're always labeled “Sponsored.” Sponsors don't write or approve our articles or tool results.",
  },
  {
    title: "Featured vendors",
    body: "Vendors can pay to appear in a labeled “Featured” row at the top of a directory page. The main directory list is never reordered for money: it stays sorted by city and name.",
  },
  {
    title: "What doesn't change",
    body: "Calculator results, quiz matches and article advice are never adjusted for partners. Inside the planning app, vendor search shows no paid placement at all.",
  },
] as const;

export default function DisclosurePage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main className="mx-auto max-w-3xl px-6 pt-12 pb-16 md:pt-16">
        <Eyebrow className="mb-4 block">Disclosure</Eyebrow>
        <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[44px]">
          How First Look makes money
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">
          The planning tools, guides and directory are free. To keep them that way, some pages carry
          affiliate links, sponsor placements or featured vendor listings. Here&apos;s how each works.
        </p>
        <div className="mt-8 space-y-4">
          {POINTS.map((p) => (
            <section key={p.title} className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
              <h2 className="text-[18px] font-extrabold text-ink">{p.title}</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-[14.5px] text-muted">
          Questions, or want to work with us?{" "}
          <Link href="/advertise" className="font-semibold text-accent hover:underline">
            Advertise with First Look
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            contact us
          </Link>
          .
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
