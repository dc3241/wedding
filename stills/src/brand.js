import {staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';

// Canonical tokens from the First Look app (globals.css). Accent is #C0396B.
export const tokens = {
  canvas: '#F3EEF0',
  ink: '#241C20',
  ink2: '#7A4F4D',
  muted: '#8B7B80',
  accent: '#C0396B',
  accentSoft: '#F6DDE6',
  line: '#E8DEDB',
  sage: '#3E7660',
  sageSoft: '#DCEBE3',
  amber: '#B7791F',
  amberSoft: '#FBEBCB',
  red: '#C95550',
  redSoft: '#F8DAD8',
};

// Soft stack shadow: two layers, the second with a -8px spread.
export const softStack =
  '0 1px 2px rgba(36,28,32,0.06), 0 18px 40px -8px rgba(36,28,32,0.16)';

// Pixel sizes per format. Add formats here.
export const formats = {
  tiktok: [1080, 1920],
  pin: [1000, 1500],
  ig: [1080, 1350], // exact 4:5
  square: [1080, 1080], // LinkedIn static
};

// Themes change mood only. Fonts, wordmark, and accent stay constant.
export const themes = {
  blush: {bg: '#F3EEF0', fg: '#241C20', fg2: '#7A4F4D', wm: '#241C20', dot: '#C0396B', ring: 'transparent', ctaBg: '#C0396B', ctaFg: '#FFFFFF', url: '#C0396B', hi: '#C0396B', rule: '#E2D6D9'},
  white: {bg: '#FBF8F7', fg: '#241C20', fg2: '#7A4F4D', wm: '#241C20', dot: '#C0396B', ring: 'transparent', ctaBg: '#C0396B', ctaFg: '#FFFFFF', url: '#C0396B', hi: '#C0396B', rule: '#E8DEDB'},
  ink: {bg: '#241C20', fg: '#FFFFFF', fg2: '#D9C7CD', wm: '#FFFFFF', dot: '#F08DB2', ring: '#5A4A51', ctaBg: '#C0396B', ctaFg: '#FFFFFF', url: '#F08DB2', hi: '#F08DB2', rule: '#4A3C42'},
  rose: {bg: '#C0396B', fg: '#FFFFFF', fg2: '#FBE3EC', wm: '#FFFFFF', dot: '#FFFFFF', ring: 'rgba(255,255,255,0.45)', ctaBg: '#FFFFFF', ctaFg: '#C0396B', url: '#FFFFFF', hi: '#FFE3EE', rule: '#D9749A'},
  sage: {bg: '#E2EEE7', fg: '#241C20', fg2: '#2F5E4C', wm: '#241C20', dot: '#C0396B', ring: 'transparent', ctaBg: '#C0396B', ctaFg: '#FFFFFF', url: '#C0396B', hi: '#C0396B', rule: '#C4D8CD'},
};

export const fontSans =
  "'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const fontMark = "'Cormorant Garamond', Georgia, serif";

let loaded = false;
export const loadBrandFonts = async () => {
  if (loaded) return;
  loaded = true;
  const weights = ['400', '500', '600', '700', '800'];
  await Promise.all([
    ...weights.map((w) =>
      loadFont({
        family: 'Figtree',
        url: staticFile(`fonts/figtree-latin-${w}-normal.woff2`),
        weight: w,
      }),
    ),
    loadFont({
      family: 'Cormorant Garamond',
      url: staticFile('fonts/cormorant-garamond-latin-500-italic.woff2'),
      weight: '500',
      style: 'italic',
    }),
  ]);
};
