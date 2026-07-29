import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "./types";
import { resolveWeddingTemplate } from "./templates/registry";
import { resolveWeddingTheme } from "./themes";
import { SITE_GUTTER, Wrap } from "./layout";
import { SiteFooter } from "./SiteFooter";

type WeddingSiteViewProps = {
  content: WeddingWebsiteContent;
  template: string;
  theme: string;
  rsvpSlot?: ReactNode;
  registryHref?: string | null;
  homeHref?: string | null;
  pageSlot?: ReactNode;
};

export function WeddingSiteView({
  content,
  template,
  theme,
  rsvpSlot,
  registryHref,
  homeHref,
  pageSlot,
}: WeddingSiteViewProps) {
  const { Component } = resolveWeddingTemplate(template);
  const palette = resolveWeddingTheme(theme);
  const showRsvp = !pageSlot && content.rsvp.visible && rsvpSlot;

  return (
    <div style={palette.cssVars}>
      <Component
        content={content}
        theme={theme}
        registryHref={registryHref}
        homeHref={homeHref}
        pageSlot={pageSlot}
      />
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
