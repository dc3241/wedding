import {
  sanitizeTravelUrl,
  travelPlaceKindLabel,
  type TravelPlace,
  type WeddingWebsiteContent,
} from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showTravel, type SectionVariant } from "./section-meta";

type TravelSectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

function PlaceCard({
  place,
  align,
}: {
  place: TravelPlace;
  align: "left" | "center";
}) {
  const href = sanitizeTravelUrl(place.url);
  const kindLabel = travelPlaceKindLabel(place.kind);

  return (
    <article
      className={
        align === "center"
          ? "rounded-lg border px-[28px] py-[30px] text-center"
          : "rounded-lg border px-[28px] py-[30px] text-left"
      }
      style={{
        background: "var(--ws-surface)",
        borderColor: "var(--ws-border)",
      }}
    >
      <p
        className="mb-3 text-[11px] tracking-[0.2em] uppercase"
        style={{ color: "var(--ws-accent)" }}
      >
        {kindLabel}
      </p>
      <h3
        className="font-serif-display m-0 text-[24px] font-medium"
        style={{ color: "var(--ws-ink)" }}
      >
        {place.name.trim()}
      </h3>
      {place.detail?.trim() ? (
        <p
          className="m-0 mt-2 whitespace-pre-line text-[15px] leading-relaxed"
          style={{ color: "var(--ws-muted)" }}
        >
          {place.detail.trim()}
        </p>
      ) : null}
      {place.note?.trim() ? (
        <p
          className="m-0 mt-3 text-[13px] tracking-[0.04em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {place.note.trim()}
        </p>
      ) : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-[12.5px] font-medium tracking-[0.14em] uppercase no-underline"
          style={{ color: "var(--ws-accent)" }}
        >
          Learn more →
        </a>
      ) : null}
    </article>
  );
}

export function TravelSection({ content, variant, tint }: TravelSectionProps) {
  if (!showTravel(content)) return null;

  const { travel } = content;
  const leftAlign = variant === "editorial" || variant === "minimalist";
  const align = leftAlign ? "left" : "center";
  const places = travel.places.filter((place) => place.name.trim().length > 0);
  const intro = travel.body.trim();

  return (
    <Band id="travel" tint={tint}>
      <Wrap>
        <div className={leftAlign ? undefined : "text-center"}>
          <SectionHead
            variant={variant}
            eyebrow={
              variant === "minimalist" || variant === "editorial"
                ? undefined
                : "Getting there"
            }
          >
            Travel &amp; stay
          </SectionHead>

          {intro ? (
            <p
              className={
                leftAlign
                  ? "m-0 max-w-prose whitespace-pre-line text-[17px] leading-relaxed"
                  : "mx-auto m-0 max-w-prose whitespace-pre-line text-[17px] leading-relaxed"
              }
              style={{ color: "var(--ws-muted)" }}
            >
              {intro}
            </p>
          ) : null}

          {places.length > 0 ? (
            <div
              className={
                places.length === 1
                  ? intro
                    ? "mx-auto mt-10 grid max-w-xl gap-5"
                    : "mx-auto grid max-w-xl gap-5"
                  : intro
                    ? "mt-10 grid gap-5 sm:grid-cols-2"
                    : "grid gap-5 sm:grid-cols-2"
              }
            >
              {places.map((place, index) => (
                <PlaceCard
                  key={`${place.name}-${index}`}
                  place={place}
                  align={align}
                />
              ))}
            </div>
          ) : null}
        </div>
      </Wrap>
    </Band>
  );
}
