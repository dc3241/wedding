import { AdvertiseForm } from "@/app/advertise/advertise-form";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Advertise With First Look",
  description:
    "Reach engaged couples planning their own weddings: featured directory listings, sponsored placements and newsletter sponsorships on First Look.",
  path: "/advertise",
});

const OPTIONS = [
  {
    title: "Featured directory listing",
    body: "A labeled Featured spot at the top of your state's venue or vendor page, where couples are actively shortlisting.",
  },
  {
    title: "Sponsored placement",
    body: "A labeled card on the planning tools, articles or homepage, matched to what couples are working on.",
  },
  {
    title: "Newsletter sponsorship",
    body: "A short sponsor slot in the weekly planning email, which is timed to each couple's wedding date.",
  },
] as const;

export default function AdvertisePage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main className="mx-auto max-w-4xl px-6 pt-12 pb-16 md:px-10 md:pt-16">
        <Eyebrow className="mb-4 block">Advertise</Eyebrow>
        <h1 className="max-w-[22ch] text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[46px]">
          Reach couples while they&apos;re choosing vendors.
        </h1>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted">
          First Look is where couples plan their own weddings: the directory, the calculators, the
          venue quiz and the planning app. Every paid spot is clearly labeled, and nothing changes
          the main directory order. Here&apos;s{" "}
          <Link href="/disclosure" className="font-semibold text-accent hover:underline">
            how that works
          </Link>
          .
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((o) => (
            <section key={o.title} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-raised">
              <h2 className="text-[16px] font-extrabold text-ink">{o.title}</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{o.body}</p>
            </section>
          ))}
        </div>
        <h2 className="mt-12 mb-4 text-[22px] font-extrabold tracking-[-0.02em] text-ink">Get in touch</h2>
        <AdvertiseForm />
      </main>
      <MarketingFooter />
    </div>
  );
}
