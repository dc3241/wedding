import { z } from "zod";
import { PRODUCT_SHOT_SLUGS } from "@/lib/admin/content-queue/product-shots";

export const SLIDE_FORMATS = ["tiktok", "pin", "ig", "square"] as const;
export const SLIDE_LAYOUTS = [
  "headline-card",
  "headline-phone",
  "big-number",
  "before-after",
  "tip-list",
  "steps",
  "statement",
] as const;
export const SLIDE_THEMES = ["blush", "white", "ink", "rose", "sage"] as const;
export const SLIDE_TONES = ["good", "warn", "bad", "neutral"] as const;

export type SlideFormat = (typeof SLIDE_FORMATS)[number];
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];
export type SlideTheme = (typeof SLIDE_THEMES)[number];
export type SlideTone = (typeof SLIDE_TONES)[number];

/**
 * Denied styles, switched off in one place. Empty means every theme and
 * layout the selector knows is allowed.
 */
export const DISABLED_THEMES: readonly SlideTheme[] = [];
export const DISABLED_LAYOUTS: readonly SlideLayout[] = [];

const MAX_HEADLINE = 90;
const MAX_SUPPORT = 140;

const PRODUCT_SLUGS = new Set<string>(PRODUCT_SHOT_SLUGS);

/** Latin, common punctuation, and the middle dot. Emoji and other scripts drop out. */
export function latinText(value: string, max: number): string {
  const cleaned = value
    .replace(/[^\u0000-\u024F\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trim();
}

export function isSlideLayout(value: unknown): value is SlideLayout {
  return (SLIDE_LAYOUTS as readonly string[]).includes(String(value));
}

export function isSlideTheme(value: unknown): value is SlideTheme {
  return (SLIDE_THEMES as readonly string[]).includes(String(value));
}

export function isSlideFormat(value: unknown): value is SlideFormat {
  return (SLIDE_FORMATS as readonly string[]).includes(String(value));
}

const clip = (max: number) => z.string().transform((value) => latinText(value, max));

const toneSchema = z.enum(SLIDE_TONES);

export const layoutDataSchemas = {
  "headline-card": z.object({
    tabs: z.array(clip(16)).max(4).optional(),
    rows: z
      .array(
        z.object({
          label: clip(40),
          status: clip(28),
          tone: toneSchema,
        }),
      )
      .min(1)
      .max(5),
  }),
  "headline-phone": z.object({
    shot: z.enum(["where-when", "timeline"]).optional(),
    hero: z.object({
      label: clip(32),
      value: clip(24),
      chip: clip(24).optional(),
      sub: clip(48).optional(),
    }),
    listTitle: clip(32).optional(),
    items: z
      .array(
        z.object({
          label: clip(40),
          note: clip(32).optional(),
          tone: toneSchema.optional(),
        }),
      )
      .max(4)
      .optional(),
    progress: z
      .object({
        label: clip(32),
        value: clip(32),
        pct: z.number().min(0).max(100),
      })
      .optional(),
    bulletsTitle: clip(32).optional(),
    bullets: z.array(clip(48)).max(5).optional(),
  }),
  "big-number": z.object({
    value: clip(16),
  }),
  "before-after": z.object({
    beforeTitle: clip(24).optional(),
    before: z.array(clip(48)).min(1).max(4),
    afterTitle: clip(24).optional(),
    after: z.array(clip(48)).min(1).max(4),
  }),
  "tip-list": z.object({
    tips: z
      .array(
        z.object({
          title: clip(40),
          body: clip(80).optional(),
        }),
      )
      .min(1)
      .max(5),
  }),
  steps: z.object({
    steps: z
      .array(
        z.object({
          word: clip(16),
          caption: clip(60),
        }),
      )
      .min(1)
      .max(4),
  }),
  statement: z.object({
    highlight: clip(40).optional(),
  }),
} satisfies Record<SlideLayout, z.ZodType>;

export type SlideFragment = {
  headline: string;
  support: string;
  layout: SlideLayout;
  surface: string | null;
  data: Record<string, unknown>;
  /** Validation failed; the selector should treat this as a statement. */
  degraded: boolean;
};

export type SlideSpec = {
  format: SlideFormat;
  layout: SlideLayout;
  theme: SlideTheme;
  headline: string;
  support?: string;
  cta?: boolean;
  surface?: string | null;
  /**
   * Product-shot slug drawn as a cropped screenshot on a text layout.
   * Absent on product layouts and on the posts that stay type-only.
   */
  snippet?: string | null;
  data?: Record<string, unknown>;
};

export function statementFragment(headline: string): SlideFragment {
  const text = latinText(headline, MAX_HEADLINE) || "First Look";
  return {
    headline: text,
    support: "",
    layout: "statement",
    surface: null,
    data: {},
    degraded: true,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function knownSurface(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  if (!slug || slug === "none") return null;
  return PRODUCT_SLUGS.has(slug) ? slug : null;
}

/**
 * One model slide. A known product surface may omit data — the surface
 * builder fills it. Anything else that fails validation becomes a statement.
 */
export function parseSlideFragment(raw: unknown, fallbackHeadline: string): SlideFragment {
  const row = asRecord(raw);
  const headline = latinText(
    typeof row?.headline === "string" ? row.headline : fallbackHeadline,
    MAX_HEADLINE,
  );
  if (!headline) return statementFragment(fallbackHeadline);

  const support = latinText(typeof row?.support === "string" ? row.support : "", MAX_SUPPORT);
  const surface = knownSurface(row?.surface);
  const layout = isSlideLayout(row?.layout) ? row.layout : "statement";
  const data = asRecord(row?.data) ?? {};

  if (surface) {
    return { headline, support, layout, surface, data, degraded: false };
  }

  const parsed = layoutDataSchemas[layout].safeParse(data);
  if (!parsed.success) {
    return { ...statementFragment(headline), support, degraded: true };
  }
  if (layout === "statement") {
    const highlight = (parsed.data as { highlight?: string }).highlight;
    if (highlight && !headline.includes(highlight)) {
      return { headline, support, layout: "statement", surface: null, data: {}, degraded: false };
    }
  }
  if (layout === "big-number" && !(parsed.data as { value?: string }).value) {
    return { ...statementFragment(headline), support, degraded: true };
  }
  return {
    headline,
    support,
    layout,
    surface: null,
    data: parsed.data as Record<string, unknown>,
    degraded: false,
  };
}

export function slidesFromModel(
  raw: unknown,
  count: number,
  fallbackHeadline: string,
): { fragments: SlideFragment[]; degraded: boolean } {
  if (count <= 0) return { fragments: [], degraded: false };
  const list = Array.isArray(raw) ? raw : [];
  let degraded = list.length !== count;
  const fragments: SlideFragment[] = [];
  for (let i = 0; i < count; i += 1) {
    const fragment = parseSlideFragment(list[i], fallbackHeadline);
    if (fragment.degraded) degraded = true;
    fragments.push(fragment);
  }
  return { fragments, degraded };
}

export function stylesFromSpecs(
  value: unknown,
): { layout: SlideLayout; theme: SlideTheme; shot?: string; snippet?: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    if (!row || !isSlideLayout(row.layout) || !isSlideTheme(row.theme)) return [];
    const data = asRecord(row.data);
    const shot = typeof data?.shot === "string" ? data.shot : undefined;
    const snippet = typeof row.snippet === "string" && row.snippet.trim() ? row.snippet.trim() : undefined;
    return [
      {
        layout: row.layout,
        theme: row.theme,
        ...(shot ? { shot } : {}),
        ...(snippet ? { snippet } : {}),
      },
    ];
  });
}

export function isSlideSpec(value: unknown): value is SlideSpec {
  const row = asRecord(value);
  if (!row) return false;
  return (
    isSlideFormat(row.format) &&
    isSlideLayout(row.layout) &&
    isSlideTheme(row.theme) &&
    typeof row.headline === "string" &&
    row.headline.trim().length > 0
  );
}

export function parseStoredSpecs(value: unknown): SlideSpec[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSlideSpec);
}
