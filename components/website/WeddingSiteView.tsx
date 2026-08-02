import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "./types";
import type { ExternalRegistryLink } from "./registry/types";
import { ExternalRegistryLinks } from "./registry/ExternalRegistryLinks";
import { resolveWeddingTemplate } from "./templates/registry";
import { resolveWeddingTheme } from "./themes";
import { SITE_GUTTER, Wrap } from "./layout";
import { SiteFooter } from "./SiteFooter";

type WeddingSiteViewProps = {
  content: WeddingWebsiteContent;
  template: string;
  theme: string;
  rsvpSlot?: ReactNode;
  homeHref?: string | null;
  pageSlot?: ReactNode;
  /** Outbound registry links from wedding_websites.external_registry_links. */
  externalRegistryLinks?: ExternalRegistryLink[];
};

export function WeddingSiteView({
  content,
  template,
  theme,
  rsvpSlot,
  homeHref,
  pageSlot,
  externalRegistryLinks = [],
}: WeddingSiteViewProps) {
  const { Component } = resolveWeddingTemplate(template);
  const palette = resolveWeddingTheme(theme);
  const showRsvp = !pageSlot && content.rsvp.visible && rsvpSlot;
  const showExternalLinks =
    !pageSlot && externalRegistryLinks.length > 0;

  return (
    <div style={palette.cssVars}>
      <Component
        content={content}
        theme={theme}
        homeHref={homeHref}
        pageSlot={pageSlot}
      />
      {showExternalLinks ? (
        <div
          className="font-ws-sans"
          style={{
            background: "var(--ws-bg)",
            color: "var(--ws-ink)",
            padding: `clamp(48px, 7vw, 80px) ${SITE_GUTTER}`,
          }}
        >
          <Wrap>
            <ExternalRegistryLinks links={externalRegistryLinks} />
          </Wrap>
        </div>
      ) : null}
      {showRsvp ? (
        <section
          id="rsvp"
          className="scroll-mt-8 font-ws-sans"
          style={{
            background: "var(--ws-accent-deep)",
            color: "#ffffff",
            padding: `clamp(64px, 9vw, 110px) ${SITE_GUTTER}`,
          }}
        >
          <Wrap>
            <div className="mb-10 text-center">
              <p
                className="m-0 mb-3.5 text-[12px] font-semibold tracking-[0.22em] uppercase"
                style={{
                  color: "color-mix(in srgb, var(--ws-tint) 70%, #ffffff)",
                }}
              >
                You&apos;re invited
              </p>
              <h2 className="font-serif-display m-0 text-[clamp(30px,5vw,46px)] font-medium text-white">
                RSVP
              </h2>
            </div>
            <div className="mx-auto max-w-[520px]">{rsvpSlot}</div>
          </Wrap>
        </section>
      ) : null}
      <SiteFooter names={content.hero.names} date={content.hero.date} />
    </div>
  );
}
