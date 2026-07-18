"use client";

import type { WeddingWebsiteContent } from "../types";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";

type MinimalistTemplateProps = {
  content: WeddingWebsiteContent;
  theme: string;
};

function parseDateParts(date: string) {
  const parsed = new Date(date + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    day: parsed.getDate(),
    month: parsed.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    year: parsed.getFullYear(),
    weekday: parsed.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase(),
  };
}

function BaselineGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative"
      style={{
        backgroundImage:
          "linear-gradient(var(--ws-border) 1px, transparent 1px)",
        backgroundSize: "100% 2.5rem",
        backgroundPosition: "0 0",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[11px] font-medium tracking-[0.14em] uppercase"
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
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1">
      <p
        className="pt-0.5 text-[10px] font-medium tracking-[0.12em] uppercase"
        style={{ color: "var(--ws-muted)" }}
      >
        {label}
      </p>
      <div>
        {venue ? (
          <p className="text-[15px] font-medium" style={{ color: "var(--ws-ink)" }}>
            {venue}
          </p>
        ) : null}
        {address ? (
          <p className="mt-0.5 text-[14px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
            {address}
          </p>
        ) : null}
        {time ? (
          <p className="mt-1 tabnum text-[14px] font-medium" style={{ color: "var(--ws-ink)" }}>
            {time}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DateMonolith({ date }: { date: string }) {
  const parts = parseDateParts(date);
  if (!parts) return null;

  return (
    <div
      className="mb-10 grid grid-cols-[1fr_auto] items-end gap-x-6 border-b pb-6"
      style={{ borderColor: "var(--ws-border)" }}
      aria-label={formatWeddingDate(date)}
    >
      <div>
        <p
          className="text-[10px] font-medium tracking-[0.16em]"
          style={{ color: "var(--ws-muted)" }}
        >
          {parts.weekday}
        </p>
        <p
          className="mt-1 tabnum text-[clamp(72px,18vw,112px)] leading-[0.85] font-medium tracking-[-0.04em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {parts.day}
        </p>
      </div>
      <div className="pb-2 text-right">
        <p
          className="text-[13px] font-medium tracking-[0.12em]"
          style={{ color: "var(--ws-accent)" }}
        >
          {parts.month}
        </p>
        <p
          className="tabnum mt-0.5 text-[20px] font-medium tracking-[-0.02em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {parts.year}
        </p>
      </div>
    </div>
  );
}

export function MinimalistTemplate({ content, theme }: MinimalistTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero, story, details, schedule, travel, registry } = content;

  const showStory = story.visible;
  const showDetails = details.visible;
  const showSchedule = schedule.visible && schedule.items.length > 0;
  const showTravel = travel.visible && travel.body;
  const showRegistry = registry.visible && registry.links.length > 0;

  return (
    <div
      className="min-h-full font-ws-sans text-[15px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <BaselineGrid>
        <div className="mx-auto w-full max-w-[600px] px-6 py-14">
          <header className="mb-12">
            {hero.date ? <DateMonolith date={hero.date} /> : null}
            <h1
              className="max-w-[14ch] text-[clamp(32px,7vw,48px)] leading-[1.02] font-medium tracking-[-0.03em] uppercase"
              style={{ color: "var(--ws-ink)" }}
            >
              {hero.names || "Your names"}
            </h1>
            {hero.tagline ? (
              <p className="mt-5 max-w-md text-[14px] tracking-[0.02em]" style={{ color: "var(--ws-muted)" }}>
                {hero.tagline}
              </p>
            ) : null}
            {hero.showCountdown && hero.date ? (
              <WeddingCountdown weddingDate={hero.date} align="left" />
            ) : null}
          </header>

          {showStory ? (
            <section className="mb-12 space-y-3 border-t pt-8" style={{ borderColor: "var(--ws-border)" }}>
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
          ) : null}

          {showDetails ? (
            <section className="mb-12 space-y-6 border-t pt-8" style={{ borderColor: "var(--ws-border)" }}>
              <SectionLabel>Wedding details</SectionLabel>
              <div className="space-y-6">
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
          ) : null}

          {showSchedule ? (
            <section className="mb-12 space-y-5 border-t pt-8" style={{ borderColor: "var(--ws-border)" }}>
              <SectionLabel>Schedule</SectionLabel>
              <ul className="space-y-4">
                {schedule.items.map((item, index) => (
                  <li
                    key={`${item.time}-${item.title}-${index}`}
                    className="grid grid-cols-[5.5rem_1fr] gap-x-4"
                  >
                    {item.time ? (
                      <span
                        className="tabnum text-[13px] font-medium tracking-[0.04em]"
                        style={{ color: "var(--ws-ink)" }}
                      >
                        {item.time}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium" style={{ color: "var(--ws-ink)" }}>
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
          ) : null}

          {showTravel ? (
            <section className="mb-12 space-y-3 border-t pt-8" style={{ borderColor: "var(--ws-border)" }}>
              <SectionLabel>Travel &amp; stay</SectionLabel>
              <p
                className="max-w-prose text-[15px] whitespace-pre-line"
                style={{ color: "var(--ws-muted)" }}
              >
                {travel.body}
              </p>
            </section>
          ) : null}

          {showRegistry ? (
            <section className="mb-12 space-y-3 border-t pt-8" style={{ borderColor: "var(--ws-border)" }}>
              <SectionLabel>Registry</SectionLabel>
              <ul className="space-y-2">
                {registry.links.map((link, index) => (
                  <li key={`${link.label}-${index}`}>
                    {link.url ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] font-medium tracking-[0.02em] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
          ) : null}
        </div>
      </BaselineGrid>
    </div>
  );
}
