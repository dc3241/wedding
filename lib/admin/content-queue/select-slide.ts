import type { ContentPostFormat } from "@/lib/admin/content-formats";
import { formatNeedsImages } from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import { matchProductShot, PRODUCT_SHOT_SLUGS } from "@/lib/admin/content-queue/product-shots";
import type { ContentType } from "@/lib/admin/platforms";
import {
  DISABLED_LAYOUTS,
  DISABLED_THEMES,
  SLIDE_THEMES,
  layoutDataSchemas,
  type SlideFormat,
  type SlideFragment,
  type SlideLayout,
  type SlideSpec,
  type SlideTheme,
} from "@/lib/admin/content-queue/slide-spec";
import {
  isWebsiteShot,
  pickWebsiteShot,
  surfaceData,
  surfaceLayout,
  type WebsiteShot,
} from "@/lib/admin/content-queue/surface-data";

export type RecentStyle = { layout: SlideLayout; theme: SlideTheme; shot?: string; snippet?: string };

/**
 * Text layouts that can hold one cropped product screenshot without
 * replacing the type. About half of posts get one, on a single slide.
 */
const SNIPPET_LAYOUTS = new Set<SlideLayout>(["statement", "big-number", "tip-list", "steps"]);

/** Generic tips rotate through couple screens. A matched alias wins instead. */
const SNIPPET_POOL = ["checklist", "budget", "guests", "overview", "seating", "timeline", "vendors"] as const;

function textHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Stable coin flip so regenerate keeps the same choice and a batch lands near half. */
export function postGetsSnippet(headlines: readonly string[]): boolean {
  return textHash(headlines.join("\n")) % 2 === 0;
}

function snippetFits(spec: SlideSpec): boolean {
  if (spec.format !== "pin" && spec.format !== "tiktok" && spec.format !== "ig") return false;
  if (!SNIPPET_LAYOUTS.has(spec.layout)) return false;
  const count =
    spec.layout === "tip-list"
      ? ((spec.data as { tips?: unknown[] } | undefined)?.tips?.length ?? 0)
      : spec.layout === "steps"
        ? ((spec.data as { steps?: unknown[] } | undefined)?.steps?.length ?? 0)
        : 0;
  if (spec.layout === "tip-list" || spec.layout === "steps") {
    if (count === 0) return false;
    return spec.format === "tiktok" ? count <= 3 : count <= 2;
  }
  return true;
}

function knownSnippet(value: string | null | undefined): string | null {
  if (!value) return null;
  return (PRODUCT_SHOT_SLUGS as readonly string[]).includes(value) ? value : null;
}

function pickSnippetSlug(headlines: readonly string[], recent: readonly RecentStyle[]): string {
  const matched = matchProductShot(headlines.join("\n"));
  if (matched) return matched.slug;
  const used = new Set(recent.map((style) => style.snippet).filter((slug): slug is string => Boolean(slug)));
  const fresh = SNIPPET_POOL.filter((slug) => !used.has(slug));
  const pool = fresh.length > 0 ? fresh : SNIPPET_POOL;
  return pool[textHash(headlines.join("\n")) % pool.length] ?? "checklist";
}

/** One cropped screen on the first text slide, for about half of posts. */
function withProductSnippet(
  specs: SlideSpec[],
  recent: readonly RecentStyle[],
  keep?: string | null,
): SlideSpec[] {
  const headlines = specs.map((spec) => spec.headline);
  const index = specs.findIndex(snippetFits);
  const slug =
    index >= 0 && postGetsSnippet(headlines)
      ? (knownSnippet(keep) ?? pickSnippetSlug(headlines, recent))
      : null;
  return specs.map((spec, specIndex) => {
    if (specIndex === index && slug) return { ...spec, snippet: slug };
    if (!spec.snippet) return spec;
    const { snippet: _omit, ...rest } = spec;
    return rest;
  });
}

const THEME_ORDER = SLIDE_THEMES;

/**
 * Shuffle steps through this cycle. Blush and white sit next to each other in
 * SLIDE_THEMES and read as the same card, so a click there looked like a no-op
 * and the following click stepped back.
 */
const SHUFFLE_THEME_CYCLE: readonly SlideTheme[] = ["blush", "ink", "white", "rose", "sage"];

export function nextShuffleTheme(current: SlideTheme | undefined): SlideTheme {
  const cycle = SHUFFLE_THEME_CYCLE.filter((theme) => !DISABLED_THEMES.includes(theme));
  const pool = cycle.length > 0 ? cycle : THEME_ORDER.filter((theme) => !DISABLED_THEMES.includes(theme));
  if (pool.length === 0) return "ink";
  if (!current) return pool[0] ?? "ink";
  const index = pool.indexOf(current);
  if (index === -1) return pool[0] ?? "ink";
  return pool[(index + 1) % pool.length] ?? pool[0] ?? "ink";
}

const PRODUCT_LAYOUTS = new Set<SlideLayout>(["headline-card", "headline-phone"]);

export function stillFormatFor(
  platform: ContentQueuePlatform,
  postFormat: ContentPostFormat | null,
): SlideFormat | null {
  if (!formatNeedsImages(postFormat)) return null;
  if (platform === "pinterest") return "pin";
  if (platform === "tiktok") return "tiktok";
  if (platform === "instagram") return "ig";
  return "square";
}

function allowed(layout: SlideLayout): boolean {
  return !DISABLED_LAYOUTS.includes(layout);
}

function dataFits(layout: SlideLayout, data: Record<string, unknown>, headline: string): boolean {
  const parsed = layoutDataSchemas[layout].safeParse(data);
  if (!parsed.success) return false;
  if (layout === "statement") {
    const highlight = (parsed.data as { highlight?: string }).highlight;
    if (highlight && !headline.includes(highlight)) return false;
  }
  if (layout === "big-number") {
    return Boolean((parsed.data as { value?: string }).value);
  }
  return true;
}

/** Layouts this fragment can actually render, most specific first. */
export function suitableLayouts(fragment: SlideFragment): SlideLayout[] {
  const out: SlideLayout[] = [];
  const product = fragment.surface ? surfaceLayout(fragment.surface) : null;
  if (product && allowed(product)) out.push(product);

  const requested = fragment.layout;
  if (
    !PRODUCT_LAYOUTS.has(requested) &&
    allowed(requested) &&
    dataFits(requested, fragment.data, fragment.headline) &&
    !out.includes(requested)
  ) {
    out.push(requested);
  }

  if (requested === "headline-card" && !fragment.surface && allowed("headline-card")) {
    if (dataFits("headline-card", fragment.data, fragment.headline) && !out.includes("headline-card")) {
      out.push("headline-card");
    }
  }

  if (allowed("statement") && !out.includes("statement")) out.push("statement");
  return out;
}

export function pickTheme(
  recent: RecentStyle[],
  layout: SlideLayout,
  avoid: readonly SlideTheme[] = [],
): SlideTheme {
  const pool = THEME_ORDER.filter((theme) => !DISABLED_THEMES.includes(theme) && !avoid.includes(theme));
  const usable = pool.length > 0 ? pool : THEME_ORDER.filter((theme) => !DISABLED_THEMES.includes(theme));
  const recentThemes = new Set(recent.map((style) => style.theme));
  const fresh = usable.find(
    (theme) => !recentThemes.has(theme) && !recent.some((style) => style.layout === layout && style.theme === theme),
  );
  if (fresh) return fresh;
  const unpaired = usable.find(
    (theme) => !recent.some((style) => style.layout === layout && style.theme === theme),
  );
  return unpaired ?? usable[0] ?? "blush";
}

function normalizeFragments(
  fragments: SlideFragment[],
  contentType: ContentType,
): SlideFragment[] {
  let next = fragments.map((fragment) => ({ ...fragment }));
  if (contentType === "A" || contentType === "B") {
    next = next.map((fragment) => ({ ...fragment, surface: null }));
  }
  if (contentType === "C" && next.length > 1) {
    const slug = [...next].reverse().find((fragment) => fragment.surface)?.surface ?? null;
    next = next.map((fragment, index) => {
      if (index < next.length - 1) {
        const layout = PRODUCT_LAYOUTS.has(fragment.layout) ? "statement" : fragment.layout;
        return { ...fragment, surface: null, layout };
      }
      return { ...fragment, surface: slug };
    });
  }
  if (next.length > 1 && next[0]?.surface && !next[next.length - 1]?.surface) {
    const cover = next[0];
    const last = next[next.length - 1]!;
    next[0] = { ...cover, surface: null };
    next[next.length - 1] = { ...last, surface: cover.surface };
  }
  return next;
}

function chooseLayout(
  fragment: SlideFragment,
  index: number,
  count: number,
  used: Set<SlideLayout>,
  avoid?: SlideLayout,
): SlideLayout {
  const options = suitableLayouts(fragment).filter((layout) => layout !== avoid);
  const pool = options.length > 0 ? options : suitableLayouts(fragment);

  if (count > 1 && index === 0) {
    if (pool.includes("big-number") && fragment.layout === "big-number") return "big-number";
    return "statement";
  }

  const product = fragment.surface ? surfaceLayout(fragment.surface) : null;
  if (product && pool.includes(product) && (count === 1 || index === count - 1)) {
    return product;
  }

  const varied = pool.find((layout) => !used.has(layout));
  return varied ?? pool[0] ?? "statement";
}

function dataFor(
  layout: SlideLayout,
  fragment: SlideFragment,
  websiteShot?: WebsiteShot,
): Record<string, unknown> {
  if (fragment.surface && (layout === "headline-card" || layout === "headline-phone")) {
    return surfaceData(fragment.surface, fragment.surface === "website" ? websiteShot : undefined) ?? {};
  }
  if (layout === "statement") {
    const highlight = fragment.data.highlight;
    if (typeof highlight === "string" && fragment.headline.includes(highlight)) {
      return { highlight };
    }
    return {};
  }
  if (dataFits(layout, fragment.data, fragment.headline)) return fragment.data;
  return {};
}

function ctaFor(contentType: ContentType, layout: SlideLayout, index: number, count: number): boolean {
  if (count > 1) return index === count - 1;
  if (contentType === "A" || contentType === "B") return false;
  if (layout === "tip-list") return false;
  return true;
}

export function selectSlideSpecs(args: {
  platform: ContentQueuePlatform;
  contentType: ContentType;
  fragments: SlideFragment[];
  recent?: RecentStyle[];
  avoidThemes?: readonly SlideTheme[];
  avoidLayout?: SlideLayout;
  avoidShots?: readonly string[];
  theme?: SlideTheme;
  /** Shuffle keeps the screen already chosen for this post. */
  keepSnippet?: string | null;
}): SlideSpec[] {
  const size = stillFormatFor(
    args.platform,
    args.fragments.length > 1 ? "carousel" : "static",
  );
  if (!size || args.fragments.length === 0) return [];

  const recent = args.recent ?? [];
  const websiteShot = pickWebsiteShot(
    recent.map((style) => style.shot).filter(isWebsiteShot),
    (args.avoidShots ?? []).filter(isWebsiteShot),
  );
  const fragments = normalizeFragments(args.fragments, args.contentType);
  const used = new Set<SlideLayout>();
  const layouts = fragments.map((fragment, index) => {
    const layout = chooseLayout(fragment, index, fragments.length, used, args.avoidLayout);
    used.add(layout);
    return layout;
  });
  const theme =
    args.theme && !DISABLED_THEMES.includes(args.theme)
      ? args.theme
      : pickTheme(recent, layouts[0] ?? "statement", args.avoidThemes);

  return withProductSnippet(
    fragments.map((fragment, index) => {
      const layout = layouts[index] ?? "statement";
      const support = fragment.support.trim();
      return {
        format: size,
        layout,
        theme,
        headline: fragment.headline,
        ...(support ? { support } : {}),
        cta: ctaFor(args.contentType, layout, index, fragments.length),
        surface: fragment.surface,
        data: dataFor(layout, fragment, websiteShot),
      };
    }),
    recent,
    args.keepSnippet,
  );
}

export function shuffleSlideSpecs(
  specs: SlideSpec[],
  recent: RecentStyle[],
  contentType: ContentType,
  platform: ContentQueuePlatform,
): SlideSpec[] {
  if (specs.length === 0) return [];
  const currentTheme = specs[0]?.theme;
  const fragments: SlideFragment[] = specs.map((spec) => ({
    headline: spec.headline,
    support: spec.support ?? "",
    layout: spec.layout,
    surface: spec.surface ?? null,
    data: (spec.data ?? {}) as Record<string, unknown>,
    degraded: false,
  }));
  return selectSlideSpecs({
    platform,
    contentType,
    fragments,
    recent: [
      ...recent,
      ...specs.map((spec) => ({
        layout: spec.layout,
        theme: spec.theme,
        shot: typeof spec.data?.shot === "string" ? spec.data.shot : undefined,
      })),
    ],
    theme: nextShuffleTheme(currentTheme),
    avoidLayout: specs.length === 1 && !specs[0]?.surface ? specs[0]?.layout : undefined,
    avoidShots: specs.flatMap((spec) => (typeof spec.data?.shot === "string" ? [spec.data.shot] : [])),
    keepSnippet: specs.find((spec) => spec.snippet)?.snippet ?? null,
  });
}
