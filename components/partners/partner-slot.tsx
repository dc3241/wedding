import { getPartnersFor } from "@/lib/partners-data";
import { PartnerCardView } from "@/components/partners/partner-card";
import { cn } from "@/lib/cn";
import Link from "next/link";

/**
 * MEDIA-07: labeled partner cards. Affiliate links say we may earn a
 * commission; sponsor cards say "Sponsored". Links are rel="sponsored"
 * and go through /go/<slug> so clicks are counted. Renders nothing when
 * no partner is active for the placement.
 */
export async function PartnerSlot({
  placement,
  className,
  max = 3,
}: {
  placement: string;
  className?: string;
  max?: number;
}) {
  const cards = (await getPartnersFor(placement)).slice(0, max);
  if (!cards.length) return null;
  const allSponsor = cards.every((c) => c.kind === "sponsor");

  return (
    <aside className={cn("rounded-[var(--radius-card)] bg-surface p-5 shadow-raised", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          {allSponsor ? "Sponsored" : "Partner picks"}
        </h2>
        <Link href="/disclosure" className="text-[12px] text-muted underline-offset-2 hover:underline">
          {allSponsor ? "About our sponsors" : "We may earn a commission"}
        </Link>
      </div>
      <ul className={cn("mt-3 grid gap-3", cards.length > 1 && "sm:grid-cols-2", cards.length > 2 && "lg:grid-cols-3")}>
        {cards.map((c) => (
          <li key={c.slug}>
            <PartnerCardView card={c} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
