import { JsonLd } from "@/components/marketing/json-ld";
import { faqJsonLd, type FaqItem } from "@/lib/seo";

export function MarketingFaq({
  items,
  heading = "Questions",
}: {
  items: readonly FaqItem[];
  heading?: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-14 md:px-10 md:py-20">
      <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-ink md:text-[24px]">
        {heading}
      </h2>
      <dl className="mt-8 space-y-6">
        {items.map((faq) => (
          <div
            key={faq.q}
            className="rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed"
          >
            <dt className="text-[15px] font-semibold text-ink">{faq.q}</dt>
            <dd className="mt-2 text-[14.5px] leading-relaxed text-muted">
              {faq.a}
            </dd>
          </div>
        ))}
      </dl>
      <JsonLd data={faqJsonLd(items)} />
    </section>
  );
}
