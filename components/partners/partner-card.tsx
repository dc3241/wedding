import { partnerHref, type PartnerCard } from "@/lib/partners";

/** One partner card. No server imports, so article previews can use it. */
export function PartnerCardView({ card }: { card: PartnerCard }) {
  return (
    <a
      href={partnerHref(card.slug)}
      target="_blank"
      rel="sponsored noopener"
      className="flex h-full gap-3 rounded-[var(--radius-inner)] bg-well p-4 no-underline shadow-recessed transition-colors hover:bg-accent-wash"
    >
      {card.image_url ? (
        // Partner-supplied https image; sizes vary, so a plain img keeps it simple.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image_url}
          alt=""
          className="size-14 shrink-0 rounded-[var(--radius-inner)] object-cover"
          loading="lazy"
        />
      ) : null}
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-muted">
          {card.partner_name}
          {card.kind === "sponsor" ? " · Sponsored" : ""}
        </span>
        <span className="block text-[15px] font-bold leading-snug text-ink">{card.title}</span>
        {card.body ? (
          <span className="mt-1 block text-[13px] leading-relaxed text-muted">{card.body}</span>
        ) : null}
        <span className="mt-2 block text-[13px] font-semibold text-accent">{card.cta_label} →</span>
      </span>
    </a>
  );
}
