import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { StillWordmark } from "@/lib/admin/content-queue/StillWordmark";
import type { SlideSpec, SlideTone } from "@/lib/admin/content-queue/slide-spec";

/** Layouts the pin-size Satori check covers. Other layouts stay on the render host. */
export const SATORI_LAYOUTS = ["headline-card", "headline-phone"] as const;

export function satoriSupports(layout: string): boolean {
  return (SATORI_LAYOUTS as readonly string[]).includes(layout);
}

const FORMATS: Record<string, [number, number]> = {
  tiktok: [1080, 1920],
  pin: [1000, 1500],
  ig: [1080, 1350],
  square: [1080, 1080],
};

const tokens = {
  canvas: "#F3EEF0",
  ink: "#241C20",
  muted: "#8B7B80",
  accent: "#C0396B",
  accentSoft: "#F6DDE6",
  line: "#E8DEDB",
  sage: "#3E7660",
  sageSoft: "#DCEBE3",
  amber: "#B7791F",
  amberSoft: "#FBEBCB",
  red: "#C95550",
  redSoft: "#F8DAD8",
};

/** Same two-layer shadow as stills/src/brand.js, including the -8px spread. */
export const softStack =
  "0 1px 2px rgba(36,28,32,0.06), 0 18px 40px -8px rgba(36,28,32,0.16)";

const themes = {
  blush: {
    bg: "#F3EEF0",
    fg: "#241C20",
    fg2: "#7A4F4D",
    wm: "#241C20",
    dot: "#C0396B",
    ring: "transparent",
    ctaBg: "#C0396B",
    ctaFg: "#FFFFFF",
    url: "#C0396B",
    hi: "#C0396B",
  },
  white: {
    bg: "#FBF8F7",
    fg: "#241C20",
    fg2: "#7A4F4D",
    wm: "#241C20",
    dot: "#C0396B",
    ring: "transparent",
    ctaBg: "#C0396B",
    ctaFg: "#FFFFFF",
    url: "#C0396B",
    hi: "#C0396B",
  },
  ink: {
    bg: "#241C20",
    fg: "#FFFFFF",
    fg2: "#D9C7CD",
    wm: "#FFFFFF",
    dot: "#F08DB2",
    ring: "#5A4A51",
    ctaBg: "#C0396B",
    ctaFg: "#FFFFFF",
    url: "#F08DB2",
    hi: "#F08DB2",
  },
  rose: {
    bg: "#C0396B",
    fg: "#FFFFFF",
    fg2: "#FBE3EC",
    wm: "#FFFFFF",
    dot: "#FFFFFF",
    ring: "rgba(255,255,255,0.45)",
    ctaBg: "#FFFFFF",
    ctaFg: "#C0396B",
    url: "#FFFFFF",
    hi: "#FFE3EE",
  },
  sage: {
    bg: "#E2EEE7",
    fg: "#241C20",
    fg2: "#2F5E4C",
    wm: "#241C20",
    dot: "#C0396B",
    ring: "transparent",
    ctaBg: "#C0396B",
    ctaFg: "#FFFFFF",
    url: "#C0396B",
    hi: "#C0396B",
  },
} as const;

type Theme = {
  bg: string;
  fg: string;
  fg2: string;
  wm: string;
  dot: string;
  ring: string;
  ctaBg: string;
  ctaFg: string;
  url: string;
  hi: string;
};

const toneInk: Record<SlideTone, [string, string]> = {
  good: [tokens.sageSoft, tokens.sage],
  warn: [tokens.amberSoft, tokens.amber],
  bad: [tokens.redSoft, tokens.red],
  neutral: ["#F1EBED", tokens.muted],
};

function flex(style: CSSProperties = {}): CSSProperties {
  const next: CSSProperties = { display: "flex" };
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined && value !== null) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}

function fitSize(text: string, avail: number, max: number): number {
  const chars = Math.max(1, text.length);
  for (let n = 1; n <= 3; n += 1) {
    const size = avail / (Math.ceil(chars / n) * 1.06 * 0.5);
    if (size >= max * 0.72 || n === 3) return Math.min(max, size);
  }
  return max;
}

let fontCache: { name: string; data: Buffer; weight: 400 | 500 | 600 | 700 | 800; style: "normal" }[] | null =
  null;

function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "lib/admin/content-queue/fonts");
  const weights = [400, 500, 600, 700, 800] as const;
  fontCache = weights.map((weight) => ({
    name: "Figtree",
    data: fs.readFileSync(path.join(dir, `figtree-latin-${weight}-normal.woff`)),
    weight,
    style: "normal" as const,
  }));
  return fontCache;
}

function Headline({
  text,
  color,
  avail,
  max,
  align,
}: {
  text: string;
  color: string;
  avail: number;
  max: number;
  align: "left" | "center";
}) {
  const size = fitSize(text, avail, max);
  return (
    <div
      style={flex({
        fontFamily: "Figtree",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.03,
        textAlign: align,
        color,
      })}
    >
      {text}
    </div>
  );
}

function Support({
  text,
  color,
  u,
  align,
  size = 38,
  maxWidth,
}: {
  text?: string;
  color: string;
  u: number;
  align: "left" | "center";
  size?: number;
  maxWidth?: number;
}) {
  if (!text) return null;
  return (
    <div
      style={flex({
        marginTop: 26 * u,
        fontFamily: "Figtree",
        fontSize: size * u,
        lineHeight: 1.3,
        fontWeight: 500,
        color,
        textAlign: align,
        maxWidth,
      })}
    >
      {text}
    </div>
  );
}

function Pill({ children, tone, u }: { children: string; tone: SlideTone; u: number }) {
  const [bg, fg] = toneInk[tone] ?? toneInk.neutral;
  return (
    <div
      style={flex({
        background: bg,
        color: fg,
        fontFamily: "Figtree",
        fontWeight: 600,
        fontSize: 26 * u,
        padding: `${10 * u}px ${22 * u}px`,
        borderRadius: 999,
      })}
    >
      {children}
    </div>
  );
}

function Check({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ marginTop: size * 0.12 }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeadlineCard({ spec, t, u, W }: { spec: SlideSpec; t: Theme; u: number; W: number }) {
  const data = (spec.data ?? {}) as {
    tabs?: string[];
    rows?: { label: string; status: string; tone?: SlideTone }[];
  };
  const rows = (data.rows ?? []).slice(0, 5);
  const tabs = data.tabs ?? [];
  return (
    <div style={flex({ flexDirection: "column", width: "100%", alignItems: "center" })}>
      <div style={flex({ flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" })}>
        <Headline text={spec.headline} color={t.fg} avail={W - 140 * u} max={116 * u} align="center" />
        <Support text={spec.support} color={t.fg2} u={u} align="center" />
      </div>
      <div
        style={flex({
          flexDirection: "column",
          background: "#fff",
          borderRadius: 40 * u,
          boxShadow: softStack,
          padding: `${34 * u}px ${44 * u}px`,
          color: tokens.ink,
          width: "100%",
          marginTop: 48 * u,
        })}
      >
        {tabs.length > 0 ? (
          <div
            style={flex({
              gap: 8 * u,
              alignSelf: "center",
              background: tokens.canvas,
              borderRadius: 999,
              padding: 8 * u,
              marginBottom: 14 * u,
            })}
          >
            {tabs.map((tab, i) => (
              <div
                key={tab}
                style={flex({
                  padding: `${12 * u}px ${34 * u}px`,
                  borderRadius: 999,
                  fontFamily: "Figtree",
                  fontSize: 27 * u,
                  fontWeight: 600,
                  background: i === 0 ? "#fff" : "transparent",
                  color: i === 0 ? tokens.ink : tokens.muted,
                  boxShadow: i === 0 ? "0 1px 3px rgba(36,28,32,0.12)" : undefined,
                })}
              >
                {tab}
              </div>
            ))}
          </div>
        ) : null}
        {rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            style={flex({
              justifyContent: "space-between",
              alignItems: "center",
              padding: `${24 * u}px 0`,
              borderTop: i === 0 ? undefined : `${2 * u}px solid ${tokens.line}`,
            })}
          >
            <div style={flex({ fontFamily: "Figtree", fontSize: 34 * u, fontWeight: 600 })}>{row.label}</div>
            <Pill tone={row.tone ?? "neutral"} u={u}>
              {row.status}
            </Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneBody({
  spec,
  p,
}: {
  spec: SlideSpec;
  p: number;
}) {
  const data = (spec.data ?? {}) as {
    hero?: { label?: string; value?: string; chip?: string; sub?: string };
    listTitle?: string;
    items?: { label: string; note?: string; tone?: SlideTone }[];
    progress?: { label: string; value: string; pct: number };
    bullets?: string[];
    bulletsTitle?: string;
  };
  const hero = data.hero ?? {};
  const items = (data.items ?? []).slice(0, 4);
  const prog = data.progress;
  return (
    <div style={flex({ flexDirection: "column", width: "100%" })}>
      <div
        style={flex({
          flexDirection: "column",
          background: "#fff",
          borderRadius: 28 * p,
          padding: 26 * p,
          boxShadow: softStack,
        })}
      >
        <div style={flex({ fontFamily: "Figtree", fontSize: 22 * p, color: tokens.muted, fontWeight: 600 })}>
          {hero.label}
        </div>
        <div style={flex({ alignItems: "center", gap: 14 * p, marginTop: 6 * p })}>
          <div
            style={flex({
              fontFamily: "Figtree",
              fontSize: 60 * p,
              fontWeight: 800,
              letterSpacing: -1.5 * p,
              color: tokens.ink,
            })}
          >
            {hero.value}
          </div>
          {hero.chip ? (
            <div
              style={flex({
                background: tokens.accentSoft,
                color: tokens.accent,
                fontFamily: "Figtree",
                fontWeight: 700,
                fontSize: 20 * p,
                padding: `${6 * p}px ${14 * p}px`,
                borderRadius: 999,
              })}
            >
              {hero.chip}
            </div>
          ) : null}
        </div>
        {hero.sub ? (
          <div style={flex({ fontFamily: "Figtree", fontSize: 24 * p, marginTop: 8 * p, fontWeight: 500, color: tokens.ink })}>
            {hero.sub}
          </div>
        ) : null}
      </div>
      {data.listTitle ? (
        <div style={flex({ fontFamily: "Figtree", fontSize: 24 * p, fontWeight: 700, marginTop: 26 * p, marginBottom: 12 * p, color: tokens.ink })}>
          {data.listTitle}
        </div>
      ) : null}
      {items.map((item, i) => (
        <div
          key={`${item.label}-${i}`}
          style={flex({
            background: "#fff",
            borderRadius: 22 * p,
            padding: `${18 * p}px ${22 * p}px`,
            marginBottom: 12 * p,
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Figtree",
            fontSize: 22 * p,
            fontWeight: 600,
            boxShadow: "0 1px 2px rgba(36,28,32,0.06)",
            color: tokens.ink,
          })}
        >
          <div style={flex()}>{item.label}</div>
          <div style={flex({ color: toneInk[item.tone ?? "neutral"][1], fontWeight: 700 })}>{item.note}</div>
        </div>
      ))}
      {prog ? (
        <div
          style={flex({
            flexDirection: "column",
            background: "#fff",
            borderRadius: 22 * p,
            padding: `${20 * p}px ${22 * p}px`,
            marginTop: 14 * p,
            boxShadow: "0 1px 2px rgba(36,28,32,0.06)",
          })}
        >
          <div style={flex({ justifyContent: "space-between", fontFamily: "Figtree", fontSize: 21 * p, fontWeight: 600 })}>
            <div style={flex({ color: tokens.muted })}>{prog.label}</div>
            <div style={flex({ color: tokens.ink })}>{prog.value}</div>
          </div>
          <div style={flex({ height: 14 * p, borderRadius: 999, background: tokens.canvas, marginTop: 14 * p, width: "100%" })}>
            <div style={flex({ width: `${Math.max(0, Math.min(100, prog.pct))}%`, height: "100%", borderRadius: 999, background: tokens.sage })} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeadlinePhone({
  spec,
  t,
  u,
  W,
  H,
}: {
  spec: SlideSpec;
  t: Theme;
  u: number;
  W: number;
  H: number;
}) {
  const data = (spec.data ?? {}) as { bulletsTitle?: string; bullets?: string[] };
  const bullets = (data.bullets ?? []).slice(0, 5);
  const visible = H - 640 * u;
  const phoneW = Math.min(500 * u, visible / 1.54);
  const p = phoneW / 500;
  return (
    <div style={flex({ flexDirection: "column", width: "100%" })}>
      <div style={flex({ flexDirection: "column", alignItems: "flex-start", marginTop: 44 * u, width: "100%" })}>
        <Headline text={spec.headline} color={t.fg} avail={W - 140 * u} max={92 * u} align="left" />
        <Support text={spec.support} color={t.fg2} u={u} align="left" maxWidth={780 * u} size={36} />
      </div>
      <div style={flex({ width: "100%", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 * u })}>
        <div style={flex({ transform: `translateY(${phoneW * 0.06}px)` })}>
          <div
            style={flex({
              width: phoneW,
              height: phoneW * 2.05,
              borderRadius: 74 * p,
              background: "#1B1417",
              padding: 12 * p,
              boxShadow: `0 0 0 ${4 * p}px ${t.ring}, ${softStack}`,
            })}
          >
            <div
              style={flex({
                flexDirection: "column",
                width: "100%",
                height: "100%",
                borderRadius: 62 * p,
                background: tokens.canvas,
                overflow: "hidden",
                padding: `${74 * p}px ${28 * p}px ${28 * p}px`,
                position: "relative",
              })}
            >
              <div
                style={flex({
                  position: "absolute",
                  top: 16 * p,
                  left: phoneW / 2 - 65 * p,
                  width: 130 * p,
                  height: 36 * p,
                  borderRadius: 999,
                  background: "#1B1417",
                })}
              />
              <PhoneBody spec={spec} p={p} />
            </div>
          </div>
        </div>
        <div style={flex({ flexDirection: "column", width: 340 * u, paddingBottom: 130 * u, color: t.fg })}>
          {data.bulletsTitle ? (
            <div style={flex({ fontFamily: "Figtree", fontSize: 34 * u, fontWeight: 800, marginBottom: 20 * u })}>
              {data.bulletsTitle}
            </div>
          ) : null}
          {bullets.map((bullet) => (
            <div
              key={bullet}
              style={flex({
                gap: 14 * u,
                fontFamily: "Figtree",
                fontSize: 27 * u,
                lineHeight: 1.25,
                fontWeight: 500,
                marginBottom: 16 * u,
                alignItems: "flex-start",
              })}
            >
              <Check color={t.hi} size={27 * u} />
              <div style={flex({ flex: 1 })}>{bullet}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SlideImage({ spec, width, height }: { spec: SlideSpec; width: number; height: number }) {
  const t = themes[spec.theme] ?? themes.blush;
  const u = width / 1080;
  const tall = height / width > 1.6;
  const left = spec.layout === "headline-phone";
  const showCta = spec.cta !== false && spec.layout !== "headline-phone";
  return (
    <div
      style={flex({
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: t.bg,
        fontFamily: "Figtree",
        alignItems: left ? "flex-start" : "center",
        justifyContent: "space-between",
        padding: `${(tall ? 130 : 70) * u}px ${70 * u}px ${spec.layout === "headline-phone" ? 0 : (tall ? 130 : 70) * u}px`,
        overflow: "hidden",
        color: t.fg,
      })}
    >
      <StillWordmark size={(left ? 54 : 62) * u} color={t.wm} dot={t.dot} />
      {spec.layout === "headline-phone" ? (
        <HeadlinePhone spec={spec} t={t} u={u} W={width} H={height} />
      ) : (
        <HeadlineCard spec={spec} t={t} u={u} W={width} />
      )}
      {showCta ? (
        <div style={flex({ alignItems: "center", gap: 22 * u })}>
          <div
            style={flex({
              background: t.ctaBg,
              color: t.ctaFg,
              fontFamily: "Figtree",
              fontWeight: 700,
              fontSize: 32 * u,
              padding: `${18 * u}px ${40 * u}px`,
              borderRadius: 999,
            })}
          >
            Start free
          </div>
          <div style={flex({ color: t.url, fontFamily: "Figtree", fontWeight: 700, fontSize: 34 * u })}>
            usefirstlook.app
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function renderSatoriSlide(spec: SlideSpec): Promise<Buffer> {
  if (!satoriSupports(spec.layout)) {
    throw new Error(`Satori does not render ${spec.layout}.`);
  }
  const [width, height] = FORMATS[spec.format] ?? FORMATS.pin;
  const response = new ImageResponse(<SlideImage spec={spec} width={width} height={height} />, {
    width,
    height,
    fonts: loadFonts(),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8 || bytes[0] !== 0x89) {
    throw new Error("Satori did not return a PNG.");
  }
  return bytes;
}
