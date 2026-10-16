import type { ContentIntent } from "@/lib/admin/content-week";
import type { PillVariant } from "@/components/ui/pill";
import type { SlideLayout } from "@/lib/admin/content-queue/slide-spec";
import type { TopicDeckId } from "@/lib/admin/content-topics";

/**
 * Creative shape of a shortlist idea — independent of tip/promo slot intent.
 * Tip/promo still gate schedule slots; style shapes copy, cover, and CTA.
 */
export type PostStyle =
  | "tip"
  | "save_this"
  | "myth"
  | "before_after"
  | "numbered"
  | "hot_take"
  | "stop_doing"
  | "promo";

export const POST_STYLES: PostStyle[] = [
  "tip",
  "save_this",
  "myth",
  "before_after",
  "numbered",
  "hot_take",
  "stop_doing",
  "promo",
];

export type PostStyleMeta = {
  key: PostStyle;
  label: string;
  /** Which shortlist column this style may fill. */
  buckets: ContentIntent[];
  pill: PillVariant;
  /** How the ideation hook should sound. */
  brief: string;
  /** How Produce should shape slides. */
  produceBrief: string;
  /** Preferred cover / single-slide layouts, most specific first. */
  coverLayouts: SlideLayout[];
  /** CTA on the last (or only) image slide. Null = no product CTA. */
  ctaLabel: string | null;
  /** Topic deck to draw from inside a tip or promo bucket. */
  tipDeck: TopicDeckId;
  promoDeck: TopicDeckId;
};

export const POST_STYLE_META: Record<PostStyle, PostStyleMeta> = {
  tip: {
    key: "tip",
    label: "Tip",
    buckets: ["tip", "promo"],
    pill: "sage",
    brief: "Classic useful advice in one or two sentences. Do not name First Look or any product.",
    produceBrief:
      "Pure tip. Surface none on tip-family. Prefer statement or big-number cover; tip-list if the idea is already a short list. Promo-slot tip may soft-plug on the image only.",
    coverLayouts: ["big-number", "statement", "tip-list"],
    ctaLabel: null,
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
  save_this: {
    key: "save_this",
    label: "Save this",
    buckets: ["tip", "promo"],
    pill: "accent",
    brief:
      "A saveable checklist or 'send this to your vendors' / 'send this to your team' list. Lead with Save this / send this. Real checklist items. Do not name First Look in the hook.",
    produceBrief:
      "Checklist post. Cover can be statement or tip-list. Body uses tip-list. Last slide CTA label is Save this. Soft product only if intent is promo; tip stays surface none.",
    coverLayouts: ["tip-list", "big-number", "statement"],
    ctaLabel: "Save this",
    tipDeck: "couples_list",
    promoDeck: "couples_list",
  },
  myth: {
    key: "myth",
    label: "Myth vs fact",
    buckets: ["tip", "promo"],
    pill: "clay",
    brief:
      "Open on a common myth, then the correction. One myth, one fact. Do not name First Look.",
    produceBrief:
      "Myth vs fact. Prefer before-after (before=myth, after=fact) or a two-beat statement cover then fact slide.",
    coverLayouts: ["before-after", "statement"],
    ctaLabel: null,
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
  before_after: {
    key: "before_after",
    label: "Before / after",
    buckets: ["tip", "promo"],
    pill: "clay",
    brief:
      "Chaos vs calm. Name the messy before and the clear after in everyday words. Tip: no product. Promo: the after may be the product lightly.",
    produceBrief:
      "Before/after layout on cover or as the whole static. Tip: surface none. Promo: soft plug on the after side or last slide.",
    coverLayouts: ["before-after", "headline-card", "statement"],
    ctaLabel: "Start free",
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
  numbered: {
    key: "numbered",
    label: "Numbered list",
    buckets: ["tip", "promo"],
    pill: "sage",
    brief:
      "Cover line plus several distinct pieces of advice (about five). Tip: no product name. Promo/list: one light First Look mention inside one item, never the cover.",
    produceBrief:
      "Carousel: cover (statement or big-number) then one tip per slide, or tip-list for a static/pin. Prefer tip-list / steps / statement.",
    coverLayouts: ["big-number", "statement", "tip-list"],
    ctaLabel: "Start free",
    tipDeck: "couples_list",
    promoDeck: "couples_list",
  },
  hot_take: {
    key: "hot_take",
    label: "Hot take",
    buckets: ["tip", "promo"],
    pill: "rosewood",
    brief:
      "Unpopular opinion in one sharp line, then a short why. Pattern: 'Unpopular opinion:' or a blunt claim. Do not name First Look.",
    produceBrief: "Huge statement cover. Optional support line. Surface none on tip; soft-plug image OK on promo.",
    coverLayouts: ["statement", "big-number"],
    ctaLabel: null,
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
  stop_doing: {
    key: "stop_doing",
    label: "Stop doing",
    buckets: ["tip", "promo"],
    pill: "rosewood",
    brief:
      "Lead with Stop doing X (a bad habit the audience actually has), then what to do instead. Do not name First Look.",
    produceBrief:
      "Statement or before-after cover (stop vs do this). Surface none for tip; soft-plug OK on promo.",
    coverLayouts: ["statement", "before-after", "steps"],
    ctaLabel: null,
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
  promo: {
    key: "promo",
    label: "Pain → feature",
    buckets: ["promo"],
    pill: "accent",
    brief:
      "Open on the pain, then how First Look handles it. Specific, never generic SaaS-speak. You may name First Look.",
    produceBrief:
      "Direct or soft promo. Product surface on the plug slide. Pain on cover (statement), feature on last slide.",
    coverLayouts: ["statement", "before-after", "headline-phone"],
    ctaLabel: "Start free",
    tipDeck: "couples_tip",
    promoDeck: "couples_promo",
  },
};

export function isPostStyle(value: unknown): value is PostStyle {
  return typeof value === "string" && (POST_STYLES as string[]).includes(value);
}

export function postStyleMeta(style: PostStyle | null | undefined): PostStyleMeta | null {
  if (!style || !isPostStyle(style)) return null;
  return POST_STYLE_META[style];
}

export function postStyleLabel(style: PostStyle | null | undefined): string {
  return postStyleMeta(style)?.label ?? "Style";
}

/** Styles allowed in the tip shortlist column. */
export const TIP_POST_STYLES: PostStyle[] = POST_STYLES.filter((key) =>
  POST_STYLE_META[key].buckets.includes("tip"),
);

/**
 * Styles allowed in the promo shortlist column (pins + slideshows).
 * Wider than tip so promo slots can still test Save this / myth / hot take.
 */
export const PROMO_POST_STYLES: PostStyle[] = POST_STYLES.filter((key) =>
  POST_STYLE_META[key].buckets.includes("promo"),
);

/** LinkedIn shortlist — every creative style, always venue/planner facing. */
export const LINKEDIN_POST_STYLES: PostStyle[] = [...POST_STYLES];

export function stylesForIntent(intent: ContentIntent): PostStyle[] {
  return intent === "tip" ? TIP_POST_STYLES : PROMO_POST_STYLES;
}

export function deckForStyle(style: PostStyle, intent: ContentIntent): TopicDeckId {
  const meta = POST_STYLE_META[style];
  return intent === "tip" ? meta.tipDeck : meta.promoDeck;
}

/** LinkedIn topics stay on venue decks regardless of creative style. */
export function linkedInDeckForStyle(style: PostStyle): TopicDeckId {
  if (style === "promo" || style === "before_after" || style === "numbered" || style === "save_this") {
    return "venue_promo";
  }
  return "venue_tip";
}

export function ctaLabelForStyle(style: PostStyle | null | undefined): string | null {
  const meta = postStyleMeta(style);
  if (!meta) return "Start free";
  return meta.ctaLabel;
}

/** Ideation + Produce prompt block listing every style. */
export function stylePromptBlock(): string {
  return POST_STYLES.map((key) => {
    const meta = POST_STYLE_META[key];
    return `- ${key} (${meta.label}): ${meta.brief}`;
  }).join("\n");
}

export function produceStylePromptBlock(): string {
  return POST_STYLES.map((key) => {
    const meta = POST_STYLE_META[key];
    return `- ${key}: ${meta.produceBrief}`;
  }).join("\n");
}
