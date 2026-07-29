import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showDetails, type SectionVariant } from "./section-meta";

type DetailsSectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

function DetailCard({
  label,
  venue,
  address,
  time,
}: {
  label: string;
  venue: string;
  address: string;
  time: string;
}) {
  if (!venue && !address && !time) return null;

  return (
    <div
      className="rounded-lg px-[34px] py-[38px] text-center"
      style={{
        background: "var(--ws-surface)",
        border: "1px solid var(--ws-border)",
      }}
    >
      <p
        className="mb-4 text-[11px] tracking-[0.2em] uppercase"
        style={{ color: "var(--ws-accent)" }}
      >
        {label}
      </p>
      {venue ? (
        <h3
          className="font-serif-display m-0 mb-1.5 text-[27px] font-medium"
          style={{ color: "var(--ws-ink)" }}
        >
          {venue}
        </h3>
      ) : null}
      {address ? (
        <p
          className="m-0 mb-[18px] whitespace-pre-line text-[15px]"
          style={{ color: "var(--ws-muted)" }}
        >
          {address}
        </p>
      ) : null}
      {time ? (
        <p className="font-serif-display m-0 text-[20px]" style={{ color: "var(--ws-ink)" }}>
          {time}
        </p>
      ) : null}
    </div>
  );
}

export function DetailsSection({ content, variant, tint }: DetailsSectionProps) {
  if (!showDetails(content)) return null;

  const { details } = content;

  return (
    <Band id="details" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={variant === "minimalist" || variant === "editorial" ? undefined : "The day"}
        >
          {variant === "editorial" ? "Wedding details" : "Where & when"}
        </SectionHead>
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailCard
            label="Ceremony"
            venue={details.ceremonyVenue}
            address={details.ceremonyAddress}
            time={details.ceremonyTime}
          />
          <DetailCard
            label="Reception"
            venue={details.receptionVenue}
            address={details.receptionAddress}
            time={details.receptionTime}
          />
        </div>
      </Wrap>
    </Band>
  );
}
