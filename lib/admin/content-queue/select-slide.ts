import type { ContentPostFormat } from "@/lib/admin/content-formats";
import { formatNeedsImages } from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
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

export type RecentStyle = { layout: SlideLayout; theme: SlideTheme; shot?: string };

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

  return fragments.map((fragment, index) => {
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
  });
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
  });
}
