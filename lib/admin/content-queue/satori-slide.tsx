import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import { StillWordmark } from "@/lib/admin/content-queue/StillWordmark";
import type { SlideSpec, SlideTone } from "@/lib/admin/content-queue/slide-spec";
import { isWebsiteShot } from "@/lib/admin/content-queue/surface-data";

/** Every still layout. Drawn in-process; no render host required. */
export const SATORI_LAYOUTS = [
  "headline-card",
  "headline-phone",
  "big-number",
  "before-after",
  "tip-list",
  "steps",
  "statement",
] as const;

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
    rule: "#E2D6D9",
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
    rule: "#E8DEDB",
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
    rule: "#4A3C42",
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
    rule: "#D9749A",
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
    rule: "#C4D8CD",
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
  rule: string;
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

const shotCache = new Map<string, string>();
const productShotCache = new Map<string, string>();

function builtinProductShotSrc(slug: string): string {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Unknown product screenshot: ${slug}`);
  }
  const cached = productShotCache.get(slug);
  if (cached) return cached;
  const file = path.join(process.cwd(), "design/product-shots", `${slug}.png`);
  if (!fs.existsSync(file)) {
    throw new Error(`Product screenshot missing: design/product-shots/${slug}.png`);
  }
  const src = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  productShotCache.set(slug, src);
  return src;
}

function websiteShotSrc(shot: unknown): string | null {
  // Older slides stored the retired "look" editor. Show a guest page instead.
  const name = shot === "look" ? "where-when" : shot;
  if (!isWebsiteShot(name)) return null;
  const cached = shotCache.get(name);
  if (cached) return cached;
  const file = path.join(process.cwd(), "stills/public/website", `${name}.png`);
  if (!fs.existsSync(file)) {
    throw new Error(`Wedding website screenshot missing: stills/public/website/${name}.png`);
  }
  const src = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  shotCache.set(name, src);
  return src;
}

function loadFonts() {
  if (fontCache) return fontCache;
  const font = (file: string, weight: 400 | 500 | 600 | 700 | 800) => ({
    name: "Figtree",
    data: fs.readFileSync(file),
    weight,
    style: "normal" as const,
  });
  const dir = path.join(process.cwd(), "lib/admin/content-queue/fonts");
  fontCache = [
    font(path.join(dir, "figtree-latin-400-normal.woff"), 400),
    font(path.join(dir, "figtree-latin-500-normal.woff"), 500),
    font(path.join(dir, "figtree-latin-600-normal.woff"), 600),
    font(path.join(dir, "figtree-latin-700-normal.woff"), 700),
    font(path.join(dir, "figtree-latin-800-normal.woff"), 800),
  ];
  return fontCache;
}

function headlineParts(text: string, highlight?: string): { text: string; hi: boolean }[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (!highlight || !text.includes(highlight)) return words.map((word) => ({ text: word, hi: false }));
  const marked = highlight.split(/\s+/).filter((word) => word.length > 0);
  const parts: { text: string; hi: boolean }[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const slice = words.slice(i, i + marked.length).join(" ");
    if (marked.length > 0 && slice === marked.join(" ")) {
      for (const word of marked) parts.push({ text: word, hi: true });
      i += marked.length - 1;
    } else {
      parts.push({ text: words[i], hi: false });
    }
  }
  return parts;
}

function Headline({
  text,
  color,
  avail,
  max,
  align,
  highlight,
  highlightColor,
}: {
  text: string;
  color: string;
  avail: number;
  max: number;
  align: "left" | "center";
  highlight?: string;
  highlightColor?: string;
}) {
  const size = fitSize(text, avail, max);
  const type = {
    fontFamily: "Figtree",
    fontWeight: 800,
    fontSize: size,
    lineHeight: 1.04,
    letterSpacing: -size * 0.03,
    color,
  } as const;
  if (!highlight || !text.includes(highlight)) {
    return (
      <div style={flex({ ...type, textAlign: align, width: "100%" })}>
        {text}
      </div>
    );
  }
  const parts = headlineParts(text, highlight);
  return (
    <div
      style={flex({
        ...type,
        width: "100%",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
      })}
    >
      {parts.map((part, index) => (
        <span
          key={`${part.text}-${index}`}
          style={{
            color: part.hi ? highlightColor : color,
            marginRight: index === parts.length - 1 ? 0 : size * 0.28,
          }}
        >
          {part.text}
        </span>
      ))}
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

function Cross({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ marginTop: size * 0.12 }}>
      <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
  shotSrc,
  shotFit = "cover",
}: {
  spec: SlideSpec;
  t: Theme;
  u: number;
  W: number;
  H: number;
  shotSrc?: string | null;
  /** Uploaded desktop screens stay whole. Baked website shots fill the bezel. */
  shotFit?: "cover" | "contain";
}) {
  const data = (spec.data ?? {}) as { bulletsTitle?: string; bullets?: string[] };
  const bullets = (data.bullets ?? []).slice(0, 5);
  const visible = H - 640 * u;
  const phoneW = Math.min(500 * u, visible / 1.54);
  const p = phoneW / 500;
  const baked = Boolean(shotSrc);
  const screenW = phoneW - 24 * p;
  const screenH = phoneW * 2.05 - 24 * p;
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
                width: baked ? screenW : "100%",
                height: baked ? screenH : "100%",
                borderRadius: 62 * p,
                background: tokens.canvas,
                overflow: "hidden",
                padding: baked ? 0 : `${74 * p}px ${28 * p}px ${28 * p}px`,
                position: "relative",
              })}
            >
              {baked ? (
                <img
                  alt=""
                  src={shotSrc ?? ""}
                  width={Math.round(screenW)}
                  height={Math.round(screenH)}
                  style={{
                    width: Math.round(screenW),
                    height: Math.round(screenH),
                    objectFit: shotFit,
                    background: tokens.canvas,
                  }}
                />
              ) : (
                <PhoneBody spec={spec} p={p} />
              )}
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

function BigNumber({ spec, t, u, W }: { spec: SlideSpec; t: Theme; u: number; W: number }) {
  const value = String((spec.data as { value?: string } | undefined)?.value ?? "");
  const size = fitSize(value, W - 140 * u, 300 * u);
  return (
    <div style={flex({ flexDirection: "column", alignItems: "center", width: "100%" })}>
      <div
        style={flex({
          fontFamily: "Figtree",
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.04,
          color: t.hi,
          justifyContent: "center",
          width: "100%",
        })}
      >
        {value}
      </div>
      <div
        style={flex({
          marginTop: 30 * u,
          fontFamily: "Figtree",
          fontWeight: 800,
          fontSize: 60 * u,
          lineHeight: 1.08,
          letterSpacing: -1.5 * u,
          color: t.fg,
          textAlign: "center",
          justifyContent: "center",
          width: "100%",
        })}
      >
        {spec.headline}
      </div>
      <Support text={spec.support} color={t.fg2} u={u} align="center" />
    </div>
  );
}

function BeforeAfter({
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
  const data = (spec.data ?? {}) as {
    beforeTitle?: string;
    before?: string[];
    afterTitle?: string;
    after?: string[];
  };
  const side = H / W < 1.4;
  const before = (data.before ?? []).slice(0, 4);
  const after = (data.after ?? []).slice(0, 4);
  const lines = (items: string[], good: boolean) =>
    items.map((item, index) => (
      <div key={`${item}-${index}`} style={flex({ gap: 16 * u, alignItems: "flex-start", marginBottom: 20 * u })}>
        {good ? <Check color={tokens.sage} size={31 * u} /> : <Cross color={tokens.red} size={31 * u} />}
        <div
          style={flex({
            flex: 1,
            fontFamily: "Figtree",
            fontSize: 31 * u,
            lineHeight: 1.25,
            fontWeight: 500,
            color: tokens.ink,
          })}
        >
          {item}
        </div>
      </div>
    ));
  return (
    <div style={flex({ flexDirection: "column", width: "100%", alignItems: "center" })}>
      <div style={flex({ flexDirection: "column", alignItems: "center", width: "100%" })}>
        <Headline text={spec.headline} color={t.fg} avail={W - 140 * u} max={100 * u} align="center" />
        <Support text={spec.support} color={t.fg2} u={u} align="center" />
      </div>
      <div
        style={flex({
          flexDirection: side ? "row" : "column",
          gap: 28 * u,
          width: "100%",
          marginTop: 48 * u,
        })}
      >
        <div
          style={flex({
            flexDirection: "column",
            flex: side ? 1 : undefined,
            width: side ? undefined : "100%",
            background: "#EFE8EA",
            borderRadius: 40 * u,
            padding: `${34 * u}px ${44 * u}px`,
            color: tokens.ink,
          })}
        >
          <div
            style={flex({
              fontFamily: "Figtree",
              fontSize: 26 * u,
              fontWeight: 700,
              color: tokens.muted,
              marginBottom: 22 * u,
              letterSpacing: 1.5 * u,
            })}
          >
            {(data.beforeTitle || "Before").toUpperCase()}
          </div>
          {lines(before, false)}
        </div>
        <div
          style={flex({
            flexDirection: "column",
            flex: side ? 1 : undefined,
            width: side ? undefined : "100%",
            background: "#fff",
            borderRadius: 40 * u,
            boxShadow: softStack,
            padding: `${34 * u}px ${44 * u}px`,
            color: tokens.ink,
          })}
        >
          <div
            style={flex({
              fontFamily: "Figtree",
              fontSize: 26 * u,
              fontWeight: 700,
              color: tokens.accent,
              marginBottom: 22 * u,
              letterSpacing: 1.5 * u,
            })}
          >
            {(data.afterTitle || "After").toUpperCase()}
          </div>
          {lines(after, true)}
        </div>
      </div>
    </div>
  );
}

function TipList({ spec, t, u, W }: { spec: SlideSpec; t: Theme; u: number; W: number }) {
  const tips = ((spec.data as { tips?: { title: string; body?: string }[] } | undefined)?.tips ?? []).slice(0, 5);
  return (
    <div style={flex({ flexDirection: "column", width: "100%", alignItems: "flex-start" })}>
      <Headline text={spec.headline} color={t.fg} avail={W - 140 * u} max={92 * u} align="left" />
      <Support text={spec.support} color={t.fg2} u={u} align="left" />
      <div style={flex({ flexDirection: "column", width: "100%", marginTop: 36 * u })}>
        {tips.map((tip, index) => (
          <div
            key={`${tip.title}-${index}`}
            style={flex({
              gap: 32 * u,
              alignItems: "flex-start",
              padding: `${28 * u}px 0`,
              borderTop: `${2 * u}px solid ${t.rule}`,
              width: "100%",
            })}
          >
            <div
              style={flex({
                fontFamily: "Figtree",
                fontWeight: 800,
                fontSize: 84 * u,
                lineHeight: 1,
                color: t.hi,
                width: 90 * u,
              })}
            >
              {index + 1}
            </div>
            <div style={flex({ flexDirection: "column", flex: 1 })}>
              <div style={flex({ fontFamily: "Figtree", fontWeight: 700, fontSize: 44 * u, lineHeight: 1.15, color: t.fg })}>
                {tip.title}
              </div>
              {tip.body ? (
                <div
                  style={flex({
                    fontFamily: "Figtree",
                    fontWeight: 500,
                    fontSize: 34 * u,
                    lineHeight: 1.3,
                    marginTop: 8 * u,
                    color: t.fg2,
                  })}
                >
                  {tip.body}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Steps({ spec, t, u, W }: { spec: SlideSpec; t: Theme; u: number; W: number }) {
  const steps = ((spec.data as { steps?: { word: string; caption?: string }[] } | undefined)?.steps ?? []).slice(0, 4);
  return (
    <div style={flex({ flexDirection: "column", width: "100%", alignItems: "flex-start" })}>
      <Headline text={spec.headline} color={t.fg} avail={W - 140 * u} max={76 * u} align="left" />
      <div style={flex({ flexDirection: "column", width: "100%", marginTop: 36 * u })}>
        {steps.map((step, index) => (
          <div
            key={`${step.word}-${index}`}
            style={flex({
              flexDirection: "column",
              padding: `${26 * u}px 0`,
              borderTop: `${2 * u}px solid ${t.rule}`,
              width: "100%",
            })}
          >
            <div style={flex({ alignItems: "flex-end", gap: 26 * u })}>
              <div style={flex({ fontFamily: "Figtree", fontWeight: 700, fontSize: 34 * u, color: t.hi })}>
                0{index + 1}
              </div>
              <div
                style={flex({
                  fontFamily: "Figtree",
                  fontWeight: 800,
                  fontSize: 118 * u,
                  lineHeight: 1,
                  letterSpacing: -3 * u,
                  color: t.fg,
                })}
              >
                {step.word}
              </div>
            </div>
            {step.caption ? (
              <div
                style={flex({
                  fontFamily: "Figtree",
                  fontWeight: 500,
                  fontSize: 36 * u,
                  marginTop: 10 * u,
                  marginLeft: 76 * u,
                  color: t.fg2,
                })}
              >
                {step.caption}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Statement({ spec, t, u, W }: { spec: SlideSpec; t: Theme; u: number; W: number }) {
  const highlight = (spec.data as { highlight?: string } | undefined)?.highlight;
  return (
    <div style={flex({ flexDirection: "column", width: "100%", alignItems: "flex-start" })}>
      <Headline
        text={spec.headline}
        color={t.fg}
        avail={W - 140 * u}
        max={132 * u}
        align="left"
        highlight={highlight}
        highlightColor={t.hi}
      />
      <Support text={spec.support} color={t.fg2} u={u} align="left" size={40} maxWidth={820 * u} />
    </div>
  );
}

const LEFT_LAYOUTS = new Set(["headline-phone", "tip-list", "steps", "statement"]);

/** Full app shells. The crop keeps the main column and drops the planner rail. */
const SHELL_SHOTS = new Set([
  "guests",
  "seating",
  "overview",
  "vendors",
  "timeline",
  "dashboard",
  "leads",
  "calendar",
  "automations",
  "branding",
  "invoices",
  "vendor-library",
  "white-label",
  "website",
]);

function snippetImageBox(slug: string, innerW: number, innerH: number) {
  const shell = SHELL_SHOTS.has(slug);
  const wide = slug === "budget" || slug === "budget-categories";
  const [nw, nh] = wide ? [1904, slug === "budget" ? 900 : 510] : slug === "budget-item" ? [1200, 820] : [1235, 954];
  if (!shell && slug !== "budget-categories") {
    return { width: innerW, height: innerH, marginLeft: 0, marginTop: 0 };
  }
  const visibleFrac = shell ? 0.74 : 0.9;
  let scale = innerW / (nw * visibleFrac);
  let drawW = nw * scale;
  let drawH = nh * scale;
  if (drawH < innerH) {
    scale = innerH / nh;
    drawW = nw * scale;
    drawH = nh * scale;
  }
  const extraW = Math.max(0, drawW - innerW);
  const extraH = Math.max(0, drawH - innerH);
  return {
    width: Math.round(drawW),
    height: Math.round(drawH),
    marginLeft: Math.round(-extraW * (shell ? 0.78 : 0)),
    marginTop: Math.round(-extraH * 0.28),
  };
}

/** Cropped app screen. Sits under the type so the slide still reads as a text post. */
function SnippetCard({ src, slug, u, W }: { src: string; slug: string; u: number; W: number }) {
  const outerW = Math.round(W - 140 * u);
  const pad = Math.round(12 * u);
  const innerW = outerW - pad * 2;
  const innerH = Math.round(innerW * 0.5);
  const box = snippetImageBox(slug, innerW, innerH);
  return (
    <div
      style={flex({
        width: outerW,
        marginTop: "auto",
        background: "#fff",
        borderRadius: 40 * u,
        padding: pad,
        boxShadow: softStack,
      })}
    >
      <div
        style={flex({
          width: innerW,
          height: innerH,
          borderRadius: 28 * u,
          overflow: "hidden",
          background: tokens.canvas,
        })}
      >
        <img
          alt=""
          src={src}
          width={box.width}
          height={box.height}
          style={{
            width: box.width,
            height: box.height,
            marginLeft: box.marginLeft,
            marginTop: box.marginTop,
            objectFit: "fill",
          }}
        />
      </div>
    </div>
  );
}

export function SlideImage({
  spec,
  width,
  height,
  shotSrc,
  shotFit = "cover",
  snippetSrc,
}: {
  spec: SlideSpec;
  width: number;
  height: number;
  shotSrc?: string | null;
  shotFit?: "cover" | "contain";
  snippetSrc?: string | null;
}) {
  const t = themes[spec.theme] ?? themes.blush;
  const u = width / 1080;
  const tall = height / width > 1.6;
  const left = LEFT_LAYOUTS.has(spec.layout);
  const showCta = spec.cta !== false && spec.layout !== "headline-phone";
  const showSnippet = Boolean(snippetSrc) && spec.layout !== "headline-phone" && spec.layout !== "headline-card";
  const body =
    spec.layout === "headline-phone" ? (
      <HeadlinePhone spec={spec} t={t} u={u} W={width} H={height} shotSrc={shotSrc} shotFit={shotFit} />
    ) : spec.layout === "big-number" ? (
      <BigNumber spec={spec} t={t} u={u} W={width} />
    ) : spec.layout === "before-after" ? (
      <BeforeAfter spec={spec} t={t} u={u} W={width} H={height} />
    ) : spec.layout === "tip-list" ? (
      <TipList spec={spec} t={t} u={u} W={width} />
    ) : spec.layout === "steps" ? (
      <Steps spec={spec} t={t} u={u} W={width} />
    ) : spec.layout === "statement" ? (
      <Statement spec={spec} t={t} u={u} W={width} />
    ) : (
      <HeadlineCard spec={spec} t={t} u={u} W={width} />
    );
  return (
    <div
      style={flex({
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: t.bg,
        fontFamily: "Figtree",
        alignItems: left ? "flex-start" : "center",
        justifyContent: showSnippet ? "flex-start" : "space-between",
        padding: `${(tall ? 130 : 70) * u}px ${70 * u}px ${spec.layout === "headline-phone" ? 0 : (tall ? 130 : 70) * u}px`,
        overflow: "hidden",
        color: t.fg,
      })}
    >
      <StillWordmark size={(left ? 54 : 62) * u} color={t.wm} dot={t.dot} />
      {showSnippet ? (
        <div style={flex({ flexDirection: "column", width: "100%", marginTop: 48 * u })}>{body}</div>
      ) : (
        body
      )}
      {showSnippet && snippetSrc ? (
        <SnippetCard src={snippetSrc} slug={spec.snippet?.trim() || ""} u={u} W={width} />
      ) : null}
      {showCta ? (
        <div style={flex({ alignItems: "center", gap: 22 * u, marginTop: showSnippet ? 32 * u : undefined })}>
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
      ) : spec.layout === "headline-phone" || showSnippet ? null : (
        <div style={flex()} />
      )}
    </div>
  );
}

export async function renderSatoriSlide(
  spec: SlideSpec,
  uploadedShotSrc?: string | null,
  uploadedSnippetSrc?: string | null,
): Promise<Buffer> {
  if (!satoriSupports(spec.layout)) {
    throw new Error(`Satori does not render ${spec.layout}.`);
  }
  const [width, height] = FORMATS[spec.format] ?? FORMATS.pin;
  const uploaded = uploadedShotSrc?.trim() ? uploadedShotSrc : null;
  const productFrame =
    uploaded && (spec.layout === "headline-phone" || spec.layout === "headline-card");
  const view: SlideSpec = productFrame ? { ...spec, layout: "headline-phone" } : spec;
  const shotSrc =
    uploaded ??
    (view.layout === "headline-phone"
      ? websiteShotSrc((spec.data as { shot?: unknown } | undefined)?.shot)
      : null);
  const snippetSlug = view.snippet?.trim();
  const snippetSrc =
    snippetSlug && view.layout !== "headline-phone" && view.layout !== "headline-card"
      ? uploadedSnippetSrc?.trim() || builtinProductShotSrc(snippetSlug)
      : null;
  const response = new ImageResponse(
    <SlideImage
      spec={view}
      width={width}
      height={height}
      shotSrc={shotSrc}
      shotFit={uploaded ? "contain" : "cover"}
      snippetSrc={snippetSrc}
    />,
    {
      width,
      height,
      fonts: loadFonts(),
    },
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8 || bytes[0] !== 0x89) {
    throw new Error("Satori did not return a PNG.");
  }
  return bytes;
}
