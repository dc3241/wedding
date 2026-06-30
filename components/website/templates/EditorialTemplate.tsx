"use client";

import type { WeddingWebsiteContent } from "../types";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";
import { cn } from "@/lib/cn";

type EditorialTemplateProps = {
  content: WeddingWebsiteContent;
  theme: string;
};

function HairlineRule({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px w-full", className)}
      style={{ background: "var(--ws-border)" }}
      aria-hidden
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[12px] font-medium tracking-[0.08em] uppercase"
      style={{ color: "var(--ws-muted)" }}
    >
      {children}
    </h2>
  );
}

function DetailBlock({
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
    <div>
      <p
        className="text-[11px] font-medium tracking-[0.07em] uppercase"
        style={{ color: "var(--ws-accent)" }}
      >
        {label}
      </p>
      {venue ? (
        <p className="mt-1.5 text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
          {venue}
        </p>
      ) : null}
      {address ? (
        <p className="mt-0.5 text-[15px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
          {address}
        </p>
      ) : null}
      {time ? (
        <p className="mt-1 tabnum text-[15px]" style={{ color: "var(--ws-ink)" }}>
          {time}
        </p>
      ) : null}
    </div>
  );
}

export function EditorialTemplate({ content, theme }: EditorialTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero, story, details, schedule, travel, registry } = content;
  const displayDate = hero.date ? formatWeddingDate(hero.date) : null;

  const showStory = story.visible;
  const showDetails = details.visible;
  const showSchedule = schedule.visible && schedule.items.length > 0;
  const showTravel = travel.visible && travel.body;
  const showRegistry = registry.visible && registry.links.length > 0;

  return (
    <div
      className="min-h-full font-sans text-[15px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <div className="mx-auto w-full max-w-[640px] px-6 py-14 md:mr-auto md:ml-[max(1.5rem,calc((100vw-640px)/6))] md:pr-12">
        <header className="pb-12">
          {displayDate ? (
            <p
              className="tabnum text-[11px] font-medium tracking-[0.1em] uppercase"
              style={{ color: "var(--ws-muted)" }}
            >
              {displayDate}
            </p>
          ) : null}
          <h1
            className="font-display mt-3 max-w-[18ch] text-[clamp(44px,7vw,64px)] leading-[0.95] tracking-[-0.01em]"
            style={{ color: "var(--ws-ink)" }}
          >
            {hero.names || "Your names"}
          </h1>
          {hero.tagline ? (
            <p className="mt-5 max-w-md text-[16px]" style={{ color: "var(--ws-muted)" }}>
              {hero.tagline}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="left" />
          ) : null}
        </header>

        {showStory ? (
          <>
            <HairlineRule className="mb-10" />
            <section className="mb-10 space-y-4">
              <SectionLabel>{story.heading || "Our Story"}</SectionLabel>
              {story.body ? (
                <p
                  className="max-w-prose text-[15px] whitespace-pre-line"
                  style={{ color: "var(--ws-muted)" }}
                >
                  {story.body}
                </p>
              ) : null}
            </section>
          </>
        ) : null}

        {showDetails ? (
          <>
            <HairlineRule className="mb-10" />
            <section className="mb-10 space-y-6">
              <SectionLabel>Wedding details</SectionLabel>
              <div className="space-y-7">
                <DetailBlock
                  label="Ceremony"
                  venue={details.ceremonyVenue}
                  address={details.ceremonyAddress}
                  time={details.ceremonyTime}
                />
                <DetailBlock
                  label="Reception"
                  venue={details.receptionVenue}
                  address={details.receptionAddress}
                  time={details.receptionTime}
                />
              </div>
            </section>
          </>
        ) : null}

        {showSchedule ? (
          <>
            <HairlineRule className="mb-10" />
            <section className="mb-10 space-y-5">
              <SectionLabel>Schedule</SectionLabel>
              <ul className="space-y-0">
                {schedule.items.map((item, index) => (
                  <li
                    key={`${item.time}-${item.title}-${index}`}
                    className="grid grid-cols-[4.5rem_1fr] gap-x-4 border-t py-4 first:border-t-0 first:pt-0"
                    style={{ borderColor: "var(--ws-border)" }}
                  >
                    {item.time ? (
                      <span
                        className="tabnum text-[13px] font-medium"
                        style={{ color: "var(--ws-accent)" }}
                      >
                        {item.time}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0">
                      <p className="text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
                        {item.title}
                      </p>
                      {item.description ? (
                        <p className="mt-0.5 text-[14px]" style={{ color: "var(--ws-muted)" }}>
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        {showTravel ? (
          <>
            <HairlineRule className="mb-10" />
            <section className="mb-10 space-y-4">
              <SectionLabel>Travel &amp; stay</SectionLabel>
              <p
                className="max-w-prose text-[15px] whitespace-pre-line"
                style={{ color: "var(--ws-muted)" }}
              >
                {travel.body}
              </p>
            </section>
          </>
        ) : null}

        {showRegistry ? (
          <>
            <HairlineRule className="mb-10" />
            <section className="mb-10 space-y-4">
              <SectionLabel>Registry</SectionLabel>
              <ul className="space-y-2">
                {registry.links.map((link, index) => (
                  <li key={`${link.label}-${index}`}>
                    {link.url ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[15px] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{ color: "var(--ws-accent)" }}
                      >
                        {link.label || link.url}
                      </a>
                    ) : (
                      <span style={{ color: "var(--ws-muted)" }}>{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
