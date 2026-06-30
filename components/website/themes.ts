import type { CSSProperties } from "react";

export type WeddingTheme = {
  key: string;
  label: string;
  cssVars: CSSProperties & Record<`--${string}`, string>;
};

export const WEDDING_THEMES: Record<string, WeddingTheme> = {
  ivory: {
    key: "ivory",
    label: "Ivory",
    cssVars: {
      "--ws-bg": "#FCFCFB",
      "--ws-surface": "#FFFFFF",
      "--ws-ink": "#1C1B1A",
      "--ws-muted": "#6E6A66",
      "--ws-accent": "#7A5C6E",
      "--ws-accent-deep": "#4A3340",
      "--ws-border": "#E4DDD6",
      "--ws-tint": "#F0E9ED",
    },
  },
  sage: {
    key: "sage",
    label: "Sage",
    cssVars: {
      "--ws-bg": "#F8FAF8",
      "--ws-surface": "#FFFFFF",
      "--ws-ink": "#1C1B1A",
      "--ws-muted": "#5E6A62",
      "--ws-accent": "#5E7A6B",
      "--ws-accent-deep": "#3D5248",
      "--ws-border": "#D8E0DA",
      "--ws-tint": "#E8F0EA",
    },
  },
  dusk: {
    key: "dusk",
    label: "Dusk",
    cssVars: {
      "--ws-bg": "#FAF8F9",
      "--ws-surface": "#FFFFFF",
      "--ws-ink": "#1C1B1A",
      "--ws-muted": "#6E6468",
      "--ws-accent": "#9B5C5C",
      "--ws-accent-deep": "#6B3F3F",
      "--ws-border": "#E8DEDE",
      "--ws-tint": "#F5ECEC",
    },
  },
  blush: {
    key: "blush",
    label: "Blush",
    cssVars: {
      "--ws-bg": "#FDF9F7",
      "--ws-surface": "#FFFFFF",
      "--ws-ink": "#1C1B1A",
      "--ws-muted": "#756A68",
      "--ws-accent": "#9A6B72",
      "--ws-accent-deep": "#6B4549",
      "--ws-border": "#EDE4E0",
      "--ws-tint": "#F8EFEB",
    },
  },
};

export const DEFAULT_WEDDING_THEME = "ivory";

export function resolveWeddingTheme(theme: string): WeddingTheme {
  return WEDDING_THEMES[theme] ?? WEDDING_THEMES[DEFAULT_WEDDING_THEME];
}

export function weddingThemeOptions() {
  return Object.values(WEDDING_THEMES);
}

export function isValidWeddingTheme(theme: string): boolean {
  return theme in WEDDING_THEMES;
}
